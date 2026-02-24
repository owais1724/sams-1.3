import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) { }

  private readonly logger = new Logger(EmployeesService.name);

  async create(agencyId: string, data: CreateEmployeeDto) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      // Sanitize payload for logging
      const { password, ...safeData } = data;
      console.log(
        'Received payload for creation (sanitized):',
        JSON.stringify(safeData, null, 2),
      );
    }
    try {
      // 1. Check if user email exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) throw new ConflictException('Email already registered');

      // 2. Get the designation to use as role name
      const designation = await this.prisma.designation.findUnique({
        where: { id: data.designationId },
      });

      if (!designation) {
        throw new ConflictException('Invalid designation selected');
      }

      // 3. Find or create a role with the same name as the designation
      let role = await this.prisma.role.findFirst({
        where: {
          name: designation.name,
          agencyId: agencyId,
        },
      });

      if (!role) {
        // Ensure essential permissions exist
        const essentialActions = [
          'mark_attendance',
          'apply_leave',
          'view_projects',
        ];
        for (const action of essentialActions) {
          await this.prisma.permission.upsert({
            where: { action },
            update: {},
            create: { action, description: `Auto-created for ${action}` },
          });
        }

        // Create a new role with the designation name and essential permissions
        role = await this.prisma.role.create({
          data: {
            name: designation.name,
            description: `Auto-generated role for ${designation.name}`,
            agencyId: agencyId,
            isSystem: false,
            permissions: {
              connect: essentialActions.map((action) => ({ action })),
            },
          },
        });
      }

      // 4. Transactional creation of Employee + User
      return await this.prisma.$transaction(async (tx) => {
        const normalizedEmail = data.email.toLowerCase().trim();
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Auto-generate employee code if not provided
        let employeeCode = data.employeeCode;
        if (!employeeCode) {
          employeeCode = await this.generateUniqueCode(agencyId);
        }

        // Create Employee Record First
        const employee = await tx.employee.create({
          data: {
            fullName: data.fullName,
            employeeCode: employeeCode,
            email: normalizedEmail,
            phoneNumber: data.phoneNumber,
            status: 'ACTIVE',
            basicSalary: data.basicSalary || 0,
            salaryCurrency: data.salaryCurrency || 'USD',
            agencyId: agencyId,
            designationId: data.designationId,
          },
        });

        // Create User Account and Link to Employee
        await tx.user.create({
          data: {
            email: normalizedEmail,
            password: hashedPassword,
            fullName: data.fullName,
            agencyId: agencyId,
            roleId: role.id,
            employeeId: employee.id,
          },
        });

        return employee;
      });
    } catch (error: any) {
      this.logger.error('Create Employee Error:', error.stack);

      if (error instanceof ConflictException) throw error;

      // Handle Prisma Unique Constraint Violation
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('email')) {
          throw new ConflictException('Email address is already in use.');
        }
        if (target?.includes('employeeCode')) {
          throw new ConflictException(
            'Staff ID / Employee Code is already in use.',
          );
        }
        throw new ConflictException(`${target} already exists.`);
      }

      throw new InternalServerErrorException(
        `Failed to create personnel: ${error.message}`,
      );
    }
  }

  async update(agencyId: string, id: string, data: UpdateEmployeeDto) {
    try {
      const employee = await this.prisma.employee.findUnique({
        where: { id, agencyId },
        include: { user: true },
      });

      if (!employee) throw new ConflictException('Employee not found');

      return await this.prisma.$transaction(async (tx) => {
        // Prepare employee update data
        const employeeUpdate: any = {
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          status: data.status,
          basicSalary: data.basicSalary,
          salaryCurrency: data.salaryCurrency,
          designationId: data.designationId,
        };

        // If email is changing, check for conflicts
        if (data.email && data.email.toLowerCase().trim() !== employee.email) {
          const normalizedEmail = data.email.toLowerCase().trim();
          const existingUser = await tx.user.findUnique({
            where: { email: normalizedEmail },
          });
          if (existingUser)
            throw new ConflictException('Email already registered');
          employeeUpdate.email = normalizedEmail;
        }

        const updatedEmployee = await tx.employee.update({
          where: { id },
          data: employeeUpdate,
        });

        // Update User account if it exists and details changed
        if (employee.user) {
          const userUpdate: any = {
            email: employeeUpdate.email,
            fullName: employeeUpdate.fullName,
          };

          if (data.password) {
            userUpdate.password = await bcrypt.hash(data.password, 10);
          }

          await tx.user.update({
            where: { id: employee.user.id },
            data: userUpdate,
          });
        }

        return updatedEmployee;
      });
    } catch (error: any) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        `Failed to update employee: ${error.message}`,
      );
    }
  }

  async findAll(agencyId: string) {
    if (!agencyId) return [];
    try {
      return await this.prisma.employee.findMany({
        where: { agencyId },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              role: true,
            },
          },
          designation: true,
          assignedProjects: true,
        },
      });
    } catch (e) {
      this.logger.error('Find Employees Error:', e);
      throw e;
    }
  }

  async remove(agencyId: string, id: string, userId?: string) {
    try {
      // Find employee first to get name for logs
      const employee = await this.prisma.employee.findUnique({
        where: { id, agencyId },
      });

      if (!employee) throw new ConflictException('Personnel record not found.');

      await this.prisma.employee.delete({
        where: { id, agencyId },
      });

      // Log the action
      await this.auditLogsService.create(
        agencyId,
        {
          action: 'TERMINATE_PERSONNEL',
          details: `Personnel ${employee.fullName} (${employee.employeeCode}) was terminated and record expunged.`,
          severity: 'CRITICAL',
          entity: 'Employee',
          entityId: id,
        },
        userId,
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Remove Employee Error:', error);
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        `Failed to terminate personnel record. Please check for active assignments.`,
      );
    }
  }

  private async generateUniqueCode(agencyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'SAMS';

    // Get the count of employees in this agency to generate a sequence number
    const count = await this.prisma.employee.count({
      where: { agencyId },
    });

    let sequence = count + 1;
    let isUnique = false;
    let finalCode = '';

    while (!isUnique) {
      const paddedSequence = sequence.toString().padStart(4, '0');
      finalCode = `${prefix}-${year}-${paddedSequence}`;

      const existing = await this.prisma.employee.findUnique({
        where: {
          agencyId_employeeCode: {
            agencyId,
            employeeCode: finalCode
          }
        }
      });

      if (!existing) {
        isUnique = true;
      } else {
        sequence++;
      }
    }

    return finalCode;
  }
}
