import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
        name: data.name,
        contact: data.contact,
        email: data.email,
        address: data.address,
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
    const exists = await this.prisma.client.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Client not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this client is forbidden');

    const { id: _id, agencyId: _a, ...cleanData } = data;
    const client = await this.prisma.client.update({
      where: { id },
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
    const exists = await this.prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { projects: true, deployments: true } } }
    });

    if (!exists) throw new NotFoundException('Client not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this client is forbidden');
    const client = exists;

    await this.prisma.client.delete({
      where: { id },
    });

    await this.auditLogsService.create(agencyId, {
      action: 'TERMINATE_CLIENT',
      details: `Client "${client.name}" deleted with ${client._count.projects} linked projects and ${client._count.deployments} linked deployments.`,
      entity: 'Client',
      entityId: id,
      severity: 'WARNING'
    });

    return { success: true };
  }
}
