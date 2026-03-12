import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { UpdateDeploymentDto } from './dto/update-deployment.dto';

@Injectable()
export class DeploymentsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(agencyId: string, filters?: { status?: string; clientId?: string }) {
    if (!agencyId) return [];
    const where: any = { agencyId };
    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.clientId = filters.clientId;

    return this.prisma.deployment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        guards: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        _count: { select: { incidents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(agencyId: string, id: string) {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id, agencyId },
      include: {
        client: true,
        shift: true,
        guards: {
          include: {
            user: { select: { id: true, fullName: true, email: true, role: { select: { name: true } } } },
          },
        },
        incidents: {
          include: {
            reporter: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!deployment) throw new NotFoundException('Deployment not found');
    return deployment;
  }

  async create(agencyId: string, dto: CreateDeploymentDto, userId?: string) {
    // Validate client belongs to agency
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, agencyId },
    });
    if (!client) throw new BadRequestException('Client not found in this agency');

    // Validate shift belongs to agency
    const shift = await this.prisma.shift.findFirst({
      where: { id: dto.shiftId, agencyId, isActive: true },
    });
    if (!shift) throw new BadRequestException('Shift not found or inactive');

    // Validate date range
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const deployment = await this.prisma.deployment.create({
      data: {
        agencyId,
        clientId: dto.clientId,
        shiftId: dto.shiftId,
        startDate,
        endDate,
        notes: dto.notes,
        status: 'planned',
      },
      include: {
        client: { select: { name: true } },
        shift: { select: { name: true } },
      },
    });

    // Assign guards if provided
    if (dto.guardIds?.length) {
      await this.assignGuards(agencyId, deployment.id, dto.guardIds);
    }

    await this.auditLogsService.create(
      agencyId,
      {
        action: 'CREATE_DEPLOYMENT',
        entity: 'Deployment',
        entityId: deployment.id,
        details: `Deployment created for ${client.name} with ${shift.name} shift`,
        severity: 'INFO',
      },
      userId,
    );

    return deployment;
  }

  async update(agencyId: string, id: string, dto: UpdateDeploymentDto, userId?: string) {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id, agencyId },
    });
    if (!deployment) throw new NotFoundException('Deployment not found');

    // Prevent modification of completed/cancelled deployments
    if (['completed', 'cancelled'].includes(deployment.status) && dto.status !== 'active') {
      throw new BadRequestException('Cannot modify a completed or cancelled deployment');
    }

    const { ...cleanData } = dto;
    if (cleanData.startDate) cleanData.startDate = new Date(cleanData.startDate).toISOString();
    if (cleanData.endDate) cleanData.endDate = new Date(cleanData.endDate).toISOString();

    const updated = await this.prisma.deployment.update({
      where: { id },
      data: cleanData,
      include: {
        client: { select: { name: true } },
        shift: { select: { name: true } },
      },
    });

    await this.auditLogsService.create(
      agencyId,
      {
        action: 'UPDATE_DEPLOYMENT',
        entity: 'Deployment',
        entityId: id,
        details: `Deployment updated: status=${updated.status}`,
        severity: 'INFO',
      },
      userId,
    );

    return updated;
  }

  async updateStatus(agencyId: string, id: string, status: string, userId?: string) {
    const validStatuses = ['planned', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const deployment = await this.prisma.deployment.findFirst({
      where: { id, agencyId },
    });
    if (!deployment) throw new NotFoundException('Deployment not found');

    const updated = await this.prisma.deployment.update({
      where: { id },
      data: { status },
    });

    await this.auditLogsService.create(
      agencyId,
      {
        action: 'UPDATE_DEPLOYMENT_STATUS',
        entity: 'Deployment',
        entityId: id,
        details: `Deployment status changed from ${deployment.status} to ${status}`,
        severity: 'INFO',
      },
      userId,
    );

    return updated;
  }

  async assignGuards(agencyId: string, deploymentId: string, guardIds: string[]) {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, agencyId },
      include: { shift: true },
    });
    if (!deployment) throw new NotFoundException('Deployment not found');

    // Validate all guards belong to this agency
    const users = await this.prisma.user.findMany({
      where: { id: { in: guardIds }, agencyId, isActive: true },
      include: {
        employee: {
          include: {
            assignedProjects: {
              where: { clientId: deployment.clientId },
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (users.length !== guardIds.length) {
      throw new BadRequestException('Some guards were not found or are inactive');
    }

    // Validate each guard is assigned to a project at this deployment's client site
    for (const user of users) {
      if (!user.employee) {
        throw new BadRequestException(
          `"${user.fullName}" does not have an employee record`,
        );
      }
      if (user.employee.assignedProjects.length === 0) {
        const client = await this.prisma.client.findUnique({
          where: { id: deployment.clientId },
          select: { name: true },
        });
        throw new BadRequestException(
          `"${user.fullName}" is not assigned to any project at "${client?.name}". Assign them to a project at this client site first.`,
        );
      }
    }

    // Check for overlapping deployments for each guard
    for (const guardId of guardIds) {
      const overlap = await this.prisma.deploymentGuard.findFirst({
        where: {
          userId: guardId,
          agencyId,
          deployment: {
            id: { not: deploymentId },
            status: { in: ['planned', 'active'] },
            shiftId: deployment.shiftId,
            OR: [
              {
                startDate: { lte: deployment.endDate },
                endDate: { gte: deployment.startDate },
              },
            ],
          },
        },
        include: {
          deployment: { include: { client: { select: { name: true } } } },
          user: { select: { fullName: true } },
        },
      });

      if (overlap) {
        throw new ConflictException(
          `Guard "${overlap.user.fullName}" has an overlapping deployment at "${overlap.deployment.client.name}" during the same shift and date range`,
        );
      }
    }

    // Create guard assignments (skip duplicates)
    const results = [];
    for (const guardId of guardIds) {
      try {
        const guard = await this.prisma.deploymentGuard.create({
          data: { deploymentId, userId: guardId, agencyId },
        });
        results.push(guard);
      } catch (e: any) {
        // Skip duplicate (unique constraint violation)
        if (e.code === 'P2002') continue;
        throw e;
      }
    }

    return results;
  }

  async removeGuard(agencyId: string, deploymentId: string, guardId: string) {
    const guard = await this.prisma.deploymentGuard.findFirst({
      where: { deploymentId, userId: guardId, agencyId },
    });
    if (!guard) throw new NotFoundException('Guard assignment not found');

    return this.prisma.deploymentGuard.delete({ where: { id: guard.id } });
  }

  async findByGuard(agencyId: string, userId: string) {
    return this.prisma.deployment.findMany({
      where: {
        agencyId,
        status: { in: ['planned', 'active'] },
        guards: { some: { userId } },
      },
      include: {
        client: { select: { id: true, name: true, address: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        guards: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async remove(agencyId: string, id: string, userId?: string) {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id, agencyId },
    });
    if (!deployment) throw new NotFoundException('Deployment not found');

    if (deployment.status === 'active') {
      throw new BadRequestException('Cannot delete an active deployment. Cancel it first.');
    }

    await this.prisma.deployment.delete({ where: { id } });

    await this.auditLogsService.create(
      agencyId,
      {
        action: 'DELETE_DEPLOYMENT',
        entity: 'Deployment',
        entityId: id,
        details: 'Deployment deleted',
        severity: 'WARNING',
      },
      userId,
    );

    return { message: 'Deployment deleted successfully' };
  }
}
