import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService
  ) { }

  async create(agencyId: string, data: any) {
    const client = await this.prisma.client.create({
      data: {
        ...data,
        agencyId,
      },
    });

    await this.auditLogsService.create(agencyId, {
      action: 'CREATE_CLIENT',
      details: `New client "${client.name}" registered.`,
      entity: 'Client',
      entityId: client.id,
      severity: 'INFO'
    });

    return client;
  }

  async findAll(agencyId: string) {
    if (!agencyId) return [];
    return this.prisma.client.findMany({
      where: { agencyId },
      include: {
        projects: true,
      },
    });
  }

  async update(id: string, agencyId: string, data: any) {
    const { id: _id, agencyId: _a, ...cleanData } = data;
    const client = await this.prisma.client.update({
      where: { id, agencyId },
      data: cleanData,
    });

    await this.auditLogsService.create(agencyId, {
      action: 'UPDATE_CLIENT',
      details: `Client "${client.name}" information updated.`,
      entity: 'Client',
      entityId: id,
      severity: 'INFO'
    });

    return client;
  }

  async remove(id: string, agencyId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, agencyId },
      include: { _count: { select: { projects: true } } }
    });

    if (!client) throw new ConflictException('Client not found');
    if (client._count.projects > 0) {
      throw new ConflictException('Cannot delete client with active projects. Please deactivate or move projects first.');
    }

    await this.prisma.client.delete({
      where: { id, agencyId },
    });

    await this.auditLogsService.create(agencyId, {
      action: 'TERMINATE_CLIENT',
      details: `Client "${client.name}" relationship terminated and records archived.`,
      entity: 'Client',
      entityId: id,
      severity: 'WARNING'
    });

    return { success: true };
  }
}
