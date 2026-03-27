import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    agencyId: string | null,
    data: {
      action: string;
      entity?: string;
      entityId?: string;
      details?: string;
      severity?: string;
      metadata?: any;
    },
    userId?: string,
  ) {
    let finalAgencyId = agencyId;

    if (!finalAgencyId) {
      // Find system agency for platform-level logs
      const systemAgency = await this.prisma.agency.findUnique({
        where: { slug: 'system' },
      });
      if (systemAgency) {
        finalAgencyId = systemAgency.id;
      } else {
        this.logger.warn(
          `Skipping audit log "${data.action}" because the SYSTEM agency was not found.`,
        );
        return null;
      }
    }

    try {
      return await this.prisma.auditLog.create({
        data: {
          ...data,
          agencyId: finalAgencyId,
          userId: userId || null,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Audit log write failed for action "${data.action}". Continuing without blocking the request.`,
        error?.message ?? String(error),
      );
      return null;
    }
  }

  async findAll(agencyId: string, take: number = 200, skip: number = 0) {
    return this.prisma.auditLog.findMany({
      where: { agencyId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }
}
