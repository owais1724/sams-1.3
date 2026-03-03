import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) { }

  async create(agencyId: string, data: any) {
    // Validate client belongs to this agency
    if (data.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: data.clientId, agencyId },
      });
      if (!client) throw new ForbiddenException('Unauthorized client selection');
    }

    return this.prisma.project.create({
      data: {
        ...data,
        agencyId,
      },
    });
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

    return this.prisma.project.update({
      where: { id },
      data: safeData,
      include: { client: true },
    });
  }
}
