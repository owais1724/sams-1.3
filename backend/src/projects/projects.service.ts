import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

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

    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        location: data.location,
        description: data.description,
        isActive: data.isActive,
        clientId: data.clientId,
        agencyId,
      },
    });

    await this.auditLogsService.create(agencyId, {
      action: 'CREATE_PROJECT',
      details: `Project "${project.name}" initialized.`,
      entity: 'Project',
      entityId: project.id,
      severity: 'INFO'
    });

    return project;
  }

  async findAll(agencyId: string) {
    if (!agencyId) return [];
    return this.prisma.project.findMany({
      where: { agencyId },
      include: {
        client: true,
      },
    });
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

    // Strip fields that should not be updated directly
    const { agencyId: _a, id: _id, ...safeData } = data;

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: safeData,
      include: { client: true },
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
