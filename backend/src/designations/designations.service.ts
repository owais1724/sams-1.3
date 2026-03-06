import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
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
    const designation = await this.prisma.designation.findFirst({
      where: { id, agencyId },
      include: { _count: { select: { employees: true } } }
    });

    if (!designation) throw new NotFoundException('Designation not found');

    if (designation._count.employees > 0) {
      throw new ConflictException(`Cannot delete designation "${designation.name}" because it is currently assigned to ${designation._count.employees} employees.`);
    }

    return this.prisma.designation.delete({
      where: { id, agencyId },
    });
  }
}
