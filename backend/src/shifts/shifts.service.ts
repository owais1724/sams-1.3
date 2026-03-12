import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll(agencyId: string) {
    if (!agencyId) return [];
    return this.prisma.shift.findMany({
      where: { agencyId },
      include: {
        _count: { select: { assignments: true, deployments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(agencyId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, agencyId },
      include: {
        assignments: {
          include: {
            employee: { include: { designation: true } },
            project: true,
          },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async create(
    agencyId: string,
    data: { name: string; startTime: string; endTime: string },
  ) {
    if (!data.name || !data.startTime || !data.endTime) {
      throw new BadRequestException(
        'Shift name, start time, and end time are required',
      );
    }
    return this.prisma.shift.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        agencyId,
      },
    });
  }

  async update(
    agencyId: string,
    id: string,
    data: { name?: string; startTime?: string; endTime?: string; isActive?: boolean },
  ) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, agencyId },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    return this.prisma.shift.update({
      where: { id },
      data,
    });
  }

  async remove(agencyId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, agencyId },
      include: {
        _count: {
          select: {
            deployments: { where: { status: { in: ['planned', 'active'] } } },
          },
        },
      },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    if (shift._count.deployments > 0) {
      throw new BadRequestException(
        'Cannot delete a shift with active or planned deployments. Deactivate it instead.',
      );
    }

    return this.prisma.shift.delete({ where: { id } });
  }
}
