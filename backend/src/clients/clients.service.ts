import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) { }

  async create(agencyId: string, data: any) {
    return this.prisma.client.create({
      data: {
        ...data,
        agencyId,
      },
    });
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
    return this.prisma.client.update({
      where: { id, agencyId },
      data,
    });
  }

  async remove(id: string, agencyId: string) {
    return this.prisma.client.delete({
      where: { id, agencyId },
    });
  }
}
