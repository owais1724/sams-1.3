import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DesignationsService {
  private readonly logger = new Logger(DesignationsService.name);

  constructor(private prisma: PrismaService) { }

  async create(agencyId: string, data: { name: string; description?: string }) {
    this.logger.log(`Creating designation for agency: ${agencyId}, data: ${JSON.stringify(data)}`);

    try {
      const result = await this.prisma.designation.create({
        data: {
          ...data,
          agencyId,
        },
      });

      this.logger.log(`Successfully created designation: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create designation: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(agencyId: string) {
    if (!agencyId) return [];
    return this.prisma.designation.findMany({
      where: { agencyId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });
  }

  async remove(agencyId: string, id: string) {
    const exists = await this.prisma.designation.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } }
    });

    if (!exists) throw new NotFoundException('Designation not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this designation is forbidden');
    const designation = exists;

    if (designation._count.employees > 0) {
      throw new ConflictException(`Cannot delete designation "${designation.name}" because it is currently assigned to ${designation._count.employees} employees.`);
    }

    return this.prisma.designation.delete({
      where: { id, agencyId },
    });
  }
}
