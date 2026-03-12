import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(agencyId: string, filters?: { status?: string; severity?: number; deploymentId?: string }) {
    if (!agencyId) return [];
    const where: any = { agencyId };
    if (filters?.status) where.status = filters.status;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.deploymentId) where.deploymentId = filters.deploymentId;

    return this.prisma.incident.findMany({
      where,
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        deployment: {
          select: {
            id: true,
            client: { select: { name: true } },
            shift: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(agencyId: string, id: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, agencyId },
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        deployment: {
          include: {
            client: true,
            shift: true,
          },
        },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async create(agencyId: string, userId: string, dto: CreateIncidentDto) {
    let deploymentId = dto.deploymentId;

    // Auto-link: if guard didn't specify deployment, find their current active deployment
    if (!deploymentId) {
      const now = new Date();
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

      const activeGuard = await this.prisma.deploymentGuard.findFirst({
        where: {
          userId,
          agencyId,
          deployment: {
            status: 'active',
            startDate: { lte: endOfDay },
            endDate: { gte: startOfDay },
          },
        },
        select: { deploymentId: true },
      });
      if (activeGuard) {
        deploymentId = activeGuard.deploymentId;
      }
    }

    // If deploymentId is set, validate it belongs to agency and user is assigned
    if (deploymentId) {
      const deployment = await this.prisma.deployment.findFirst({
        where: { id: deploymentId, agencyId },
        include: { guards: true },
      });
      if (!deployment) throw new BadRequestException('Deployment not found');

      const isGuard = deployment.guards.some(g => g.userId === userId);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      const isAdmin = user?.role?.name?.toLowerCase().includes('admin');
      const isSupervisor = user?.role?.name?.toLowerCase().includes('supervisor');

      if (!isGuard && !isAdmin && !isSupervisor) {
        throw new ForbiddenException('You are not assigned to this deployment');
      }
    }

    const incident = await this.prisma.incident.create({
      data: {
        agencyId,
        reportedBy: userId,
        title: dto.title,
        description: dto.description,
        type: dto.type || null,
        deploymentId: deploymentId || null,
        severity: dto.severity || 1,
        status: 'open',
      },
      include: {
        reporter: { select: { fullName: true } },
      },
    });

    await this.auditLogsService.create(
      agencyId,
      {
        action: 'CREATE_INCIDENT',
        entity: 'Incident',
        entityId: incident.id,
        details: `Incident reported: "${dto.title}" (severity: ${dto.severity || 1})`,
        severity: (dto.severity || 1) >= 3 ? 'WARNING' : 'INFO',
      },
      userId,
    );

    return incident;
  }

  async updateStatus(agencyId: string, id: string, status: string, userId?: string, notes?: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id, agencyId },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    // Enforce sequential status transitions:
    // open → under_review → resolved → closed
    const validTransitions: Record<string, string[]> = {
      open: ['under_review', 'closed'],
      under_review: ['resolved', 'closed'],
      resolved: ['closed'],
      closed: [],
    };
    const allowed = validTransitions[incident.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from "${incident.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none (incident is closed)'}`,
      );
    }

    // Build update data — save notes to appropriate field based on transition
    const updateData: any = { status };
    if (notes) {
      if (status === 'under_review') {
        updateData.reviewNotes = notes;
      } else if (status === 'resolved' || status === 'closed') {
        updateData.resolution = notes;
      }
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        reporter: { select: { fullName: true } },
        deployment: {
          select: {
            client: { select: { name: true } },
          },
        },
      },
    });

    await this.auditLogsService.create(
      agencyId,
      {
        action: 'UPDATE_INCIDENT_STATUS',
        entity: 'Incident',
        entityId: id,
        details: `Incident status changed from "${incident.status}" to "${status}"`,
        severity: 'INFO',
      },
      userId,
    );

    return updated;
  }

  async findByReporter(agencyId: string, userId: string) {
    return this.prisma.incident.findMany({
      where: { agencyId, reportedBy: userId },
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        deployment: {
          select: {
            client: { select: { name: true } },
            shift: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
