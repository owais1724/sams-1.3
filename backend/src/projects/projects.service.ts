import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import * as QRCode from 'qrcode';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService
  ) { }

  async create(agencyId: string, data: any) {
    // Validate client belongs to this agency
    if (data.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: data.clientId, agencyId },
      });
      if (!client) throw new ForbiddenException('Unauthorized client selection');
    }

    // Validate employees belong to this agency
    if (data.employeeIds && data.employeeIds.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: { id: { in: data.employeeIds }, agencyId },
      });
      if (employees.length !== data.employeeIds.length) {
        throw new ForbiddenException('Some employees do not belong to this agency');
      }
    }

    // Generate QR code data
    const qrData = JSON.stringify({
      projectId: 'temp', // Will be updated after creation
      agencyId,
      timestamp: new Date().toISOString(),
    });

    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        location: data.location,
        description: data.description,
        isActive: data.isActive,
        clientId: data.clientId,
        agencyId,
        assignedEmployees: data.employeeIds ? {
          connect: data.employeeIds.map(id => ({ id })),
        } : undefined,
      },
    });

    // Generate actual QR code with project ID
    const actualQrData = JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      agencyId,
      timestamp: new Date().toISOString(),
    });

    // Create QR code checkpoint
    await this.prisma.checkpoint.create({
      data: {
        name: `${project.name} - Main Entry`,
        qrCode: actualQrData,
        projectId: project.id,
      },
    });

    await this.auditLogsService.create(agencyId, {
      action: 'CREATE_PROJECT',
      details: `Project "${project.name}" initialized with ${data.employeeIds?.length || 0} assigned employees.`,
      entity: 'Project',
      entityId: project.id,
      severity: 'INFO'
    });

    return this.findOne(agencyId, project.id);
  }

  async findAll(agencyId: string) {
    if (!agencyId) return [];
    return this.prisma.project.findMany({
      where: { agencyId },
      include: {
        client: true,
        assignedEmployees: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
          },
        },
        checkpoints: {
          select: {
            id: true,
            name: true,
            qrCode: true,
          },
        },
        _count: {
          select: {
            assignedEmployees: true,
          },
        },
      },
    });
  }

  async findOne(agencyId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, agencyId },
      include: {
        client: true,
        assignedEmployees: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            designation: true,
          },
        },
        checkpoints: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(agencyId: string, id: string, data: any) {
    // Ensure project belongs to this agency
    const project = await this.prisma.project.findFirst({
      where: { id, agencyId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // If clientId is being changed, validate new client belongs to same agency
    if (data.clientId && data.clientId !== project.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: data.clientId, agencyId },
      });
      if (!client) throw new ForbiddenException('Unauthorized client selection');
    }

    // Validate employees belong to this agency
    if (data.employeeIds) {
      const employees = await this.prisma.employee.findMany({
        where: { id: { in: data.employeeIds }, agencyId },
      });
      if (employees.length !== data.employeeIds.length) {
        throw new ForbiddenException('Some employees do not belong to this agency');
      }
    }

    // Strip fields that should not be updated directly
    const { agencyId: _a, id: _id, employeeIds, ...safeData } = data;

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        ...safeData,
        assignedEmployees: employeeIds ? {
          set: employeeIds.map(empId => ({ id: empId })),
        } : undefined,
      },
      include: { 
        client: true,
        assignedEmployees: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
          },
        },
      },
    });

    await this.auditLogsService.create(agencyId, {
      action: 'UPDATE_PROJECT',
      details: `Project "${updatedProject.name}" details updated.`,
      entity: 'Project',
      entityId: id,
      severity: 'INFO'
    });

    return updatedProject;
  }

  async remove(agencyId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, agencyId },
      include: {
        _count: {
          select: { attendances: true, assignedEmployees: true }
        }
      }
    });

    if (!project) throw new NotFoundException('Project not found');

    if (project._count.attendances > 0) {
      throw new ForbiddenException(`Cannot delete project "${project.name}" with existing attendance records. Consider deactivating it instead.`);
    }

    await this.prisma.project.delete({
      where: { id },
    });

    await this.auditLogsService.create(agencyId, {
      action: 'DELETE_PROJECT',
      details: `Project "${project.name}" has been permanently removed.`,
      entity: 'Project',
      entityId: id,
      severity: 'WARNING'
    });

    return { success: true };
  }
}
