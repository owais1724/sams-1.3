import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayrollDto, UpdatePayrollDto, Payroll } from './payroll.entity';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  private validatePayrollMonth(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Month must be in YYYY-MM format');
    }

    const [year, monthPart] = month.split('-').map(Number);
    if (monthPart < 1 || monthPart > 12) {
      throw new BadRequestException('Month must be between 01 and 12');
    }

    const selectedMonth = new Date(year, monthPart - 1, 1);
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    if (selectedMonth > currentMonth) {
      throw new BadRequestException('Payroll can only be generated for the current month or past months');
    }
  }

  async createPayroll(
    createPayrollDto: CreatePayrollDto,
    agencyId: string,
  ): Promise<Payroll> {
    this.validatePayrollMonth(createPayrollDto.month);

    // Validate employee belongs to this agency
    if (createPayrollDto.employeeId) {
      const exists = await this.prisma.employee.findUnique({
        where: { id: createPayrollDto.employeeId },
      });
      if (!exists) throw new NotFoundException('Employee not found');
      if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this employee is forbidden');
    }

    const payroll = await this.prisma.payroll.create({
      data: {
        ...(createPayrollDto.employeeId && {
          employeeId: createPayrollDto.employeeId,
        }),
        month: createPayrollDto.month,
        basicSalary: createPayrollDto.basicSalary,
        allowances: createPayrollDto.allowances,
        deductions: createPayrollDto.deductions,
        netPay: createPayrollDto.netPay,
        status: createPayrollDto.status,
        agencyId,
      },
      include: {
        employee: {
          include: { designation: true },
        },
      },
    });

    return this.formatPayroll(payroll);
  }

  async getPayrolls(agencyId: string): Promise<Payroll[]> {
    const payrolls = await this.prisma.payroll.findMany({
      where: { agencyId },
      include: {
        employee: {
          include: { designation: true },
        },
      },
      orderBy: { generatedDate: 'desc' },
    });

    return payrolls.map((payroll) => this.formatPayroll(payroll));
  }

  async getPayrollById(id: string, agencyId: string): Promise<Payroll> {
    const exists = await this.prisma.payroll.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Payroll not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this payroll record is forbidden');

    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          include: { designation: true },
        },
      },
    });

    return this.formatPayroll(payroll);
  }

  async updatePayroll(
    id: string,
    updatePayrollDto: UpdatePayrollDto,
    agencyId: string,
  ): Promise<Payroll> {
    const exists = await this.prisma.payroll.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Payroll not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this payroll record is forbidden');

    const updatedPayroll = await this.prisma.payroll.update({
      where: { id },
      data: updatePayrollDto,
      include: {
        employee: {
          include: { designation: true },
        },
      },
    });

    return this.formatPayroll(updatedPayroll);
  }

  async deletePayroll(id: string, agencyId: string): Promise<void> {
    const exists = await this.prisma.payroll.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Payroll not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this payroll record is forbidden');

    await this.prisma.payroll.delete({
      where: { id },
    });
  }

  async generateBulkPayroll(
    month: string,
    agencyId: string,
    designationId?: string,
  ): Promise<number> {
    if (!month) {
      throw new BadRequestException('Month is required');
    }

    this.validatePayrollMonth(month);

    // Get active employees, optionally filtered by designation
    const where: any = { agencyId, status: 'ACTIVE' };
    if (designationId) {
      where.designationId = designationId;
    }

    const employees = await this.prisma.employee.findMany({
      where,
    });

    if (employees.length === 0) {
      throw new NotFoundException('No active employees found for the selected payroll scope');
    }

    return this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (const emp of employees) {
        // Check if payroll already exists for this month and employee
        const existing = await tx.payroll.findFirst({
          where: { employeeId: emp.id, month, agencyId },
        });

        if (!existing) {
          const basicSalary = (emp as any).basicSalary || 0;
          await tx.payroll.create({
            data: {
              employeeId: emp.id,
              month,
              basicSalary: basicSalary,
              allowances: 0,
              deductions: 0,
              netPay: basicSalary,
              status: 'DRAFT',
              agencyId,
            },
          });
          count++;
        }
      }

      if (count === 0) {
        throw new ConflictException('Payroll has already been generated for the selected month and scope');
      }

      return count;
    });
  }

  async generateIndividual(
    data: { employeeId: string; month: string; amount: number },
    agencyId: string,
  ): Promise<Payroll> {
    this.validatePayrollMonth(data.month);

    // 1. Validate employee exists within this agency
    const exists = await this.prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!exists) throw new NotFoundException('Employee not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this employee is forbidden');

    // 2. Check if payroll already exists for this month and employee
    const existing = await this.prisma.payroll.findFirst({
      where: { employeeId: data.employeeId, month: data.month, agencyId },
    });

    if (existing) {
      throw new ConflictException(
        'Payroll record already exists for this employee for the selected month',
      );
    }

    const payroll = await this.prisma.payroll.create({
      data: {
        employeeId: data.employeeId,
        month: data.month,
        basicSalary: data.amount,
        allowances: 0,
        deductions: 0,
        netPay: data.amount,
        status: 'DRAFT',
        agencyId,
      },
      include: {
        employee: {
          include: { designation: true },
        },
      },
    });

    return this.formatPayroll(payroll);
  }

  async updateStatus(
    id: string,
    status: string,
    agencyId: string,
  ): Promise<Payroll> {
    const exists = await this.prisma.payroll.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Payroll not found');
    if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this payroll record is forbidden');

    const updated = await this.prisma.payroll.update({
      where: { id },
      data: { status },
      include: {
        employee: {
          include: { designation: true },
        },
      },
    });

    return this.formatPayroll(updated);
  }

  private formatPayroll(payroll: any): Payroll {
    return {
      id: payroll.id,
      employeeId: payroll.employeeId,
      month: payroll.month,
      basicSalary: payroll.basicSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      netPay: payroll.netPay,
      status: payroll.status,
      generatedDate: payroll.generatedDate,
      updatedAt: payroll.updatedAt,
      employee: payroll.employee
        ? {
            id: payroll.employee.id,
            fullName: payroll.employee.fullName,
            email: payroll.employee.email || '',
            designation: {
              name: payroll.employee.designation?.name || '',
            },
          }
        : undefined,
    };
  }
}
