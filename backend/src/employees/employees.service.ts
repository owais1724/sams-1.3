import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
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

  private readonly agencyAdminPermissions = [
    'view_clients', 'create_client', 'edit_client', 'delete_client',
    'view_projects', 'create_project', 'edit_project', 'delete_project',
    'view_employee', 'create_employee', 'edit_employee', 'delete_employee',
    'manage_roles', 'promote_employee', 'demote_employee',
    'assign_staff', 'view_attendance', 'record_attendance',
    'approve_leave', 'apply_leave', 'view_leaves', 'manage_payroll',
    'view_payroll', 'view_reports', 'view_shifts', 'manage_shifts',
    'view_deployments', 'manage_deployments', 'view_incidents',
    'report_incident', 'manage_incidents', 'view_dashboard',
  ];

  private readonly defaultStaffPermissions = [
    'record_attendance',
    'apply_leave',
  ];

  private normalizeRoleName(name?: string | null) {
    return (name || '').toLowerCase().trim();
  }

  private isAgencyAdminRole(name?: string | null) {
    const normalized = this.normalizeRoleName(name);
    return normalized === 'agency admin' || normalized === 'agencyadmin';
  }

  private async findLinkedUserByEmployeeId(agencyId: string, employeeId: string) {
    return this.prisma.user.findFirst({
      where: {
        agencyId,
        OR: [
          { employeeId },
          { previousEmployeeId: employeeId },
        ],
      },
      include: {
        role: true,
      },
    });
  }

  private async getEmployeeWithLinkedUser(agencyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        agencyId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const user = await this.findLinkedUserByEmployeeId(agencyId, employee.id);
    if (!user) {
      throw new NotFoundException('Linked user account not found');
    }

    return { employee, user };
  }

  private async ensureAgencyAdminRole(agencyId: string) {
    for (const action of this.agencyAdminPermissions) {
      await this.prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action, description: `Permission: ${action}` },
      });
    }

    const existingRole = await this.prisma.role.findFirst({
      where: {
        agencyId,
        name: 'Agency Admin',
      },
    });

    if (existingRole) {
      return existingRole;
    }

    return this.prisma.role.create({
      data: {
        name: 'Agency Admin',
        description: 'Full control of the agency',
        isSystem: true,
        agencyId,
        permissions: {
          connect: this.agencyAdminPermissions.map((action) => ({ action })),
        },
      },
    });
  }

  private async ensureDefaultStaffRole(agencyId: string) {
    for (const action of this.defaultStaffPermissions) {
      await this.prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action, description: `Permission: ${action}` },
      });
    }

    const agencyStaffRole = await this.prisma.role.findFirst({
      where: {
        agencyId,
        name: 'Staff',
      },
    });

    if (agencyStaffRole) {
      return agencyStaffRole;
    }

    const globalStaffRole = await this.prisma.role.findFirst({
      where: {
        agencyId: null,
        name: 'Staff',
      },
    });

    if (globalStaffRole) {
      return globalStaffRole;
    }

    return this.prisma.role.create({
      data: {
        name: 'Staff',
        description: 'Default staff role',
        isSystem: true,
        agencyId,
        permissions: {
          connect: this.defaultStaffPermissions.map((action) => ({ action })),
        },
      },
    });
  }

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
        // Ensure essential permissions exist (including full project permissions)
        const essentialActions = [
          'view_attendance',
          'record_attendance',
          'apply_leave',
          'view_projects',
          'create_project',
          'edit_project',
          'delete_project',
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
            salaryCurrency: 'INR',
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

      const isProd = process.env.NODE_ENV === 'production';
      throw new InternalServerErrorException(
        isProd ? 'Failed to create employee' : `Failed to create employee: ${error.message}`,
      );
    }
  }

  async update(agencyId: string, id: string, data: UpdateEmployeeDto) {
    try {
      const exists = await this.prisma.employee.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('Employee not found');
      if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this employee is forbidden');

      const employee = await this.prisma.employee.findUnique({
        where: { id },
      });

      const linkedUser = await this.findLinkedUserByEmployeeId(agencyId, id);

      return await this.prisma.$transaction(async (tx) => {
        // Prepare employee update data
        const employeeUpdate: any = {
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          status: data.status,
          basicSalary: data.basicSalary,
          salaryCurrency: 'INR',
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
          where: { id, agencyId },  // agencyId prevents cross-agency update (TOCTOU defense)
          data: employeeUpdate,
        });

        // Update User account if it exists and details changed
        if (linkedUser) {
          const userUpdate: any = {};

          if (employeeUpdate.email) userUpdate.email = employeeUpdate.email;
          if (employeeUpdate.fullName) userUpdate.fullName = employeeUpdate.fullName;

          if (data.password) {
            userUpdate.password = await bcrypt.hash(data.password, 10);
          }

          // Only perform update if there's actual data to change
          if (Object.keys(userUpdate).length > 0) {
            await tx.user.update({
              where: { id: linkedUser.id },
              data: userUpdate,
            });
          }
        }

        await this.auditLogsService.create(agencyId, {
          action: 'EDIT_EMPLOYEE',
          details: `Employee record for ${employee.fullName} (${employee.employeeCode}) updated.`,
          entity: 'Employee',
          entityId: id,
          severity: 'INFO'
        });

        return updatedEmployee;
      });
    } catch (error: any) {
      if (error instanceof ConflictException) throw error;
      const isProd = process.env.NODE_ENV === 'production';
      throw new InternalServerErrorException(
        isProd ? 'Failed to update employee' : `Failed to update employee: ${error.message}`,
      );
    }
  }

  async findAll(agencyId: string) {
    if (!agencyId) return [];
    try {
      const employees = await this.prisma.employee.findMany({
        where: { agencyId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              isActive: true,
              role: true,
            },
          },
          designation: true,
          assignedProjects: true,
        },
      });

      const employeeIdsMissingLinkedUser = employees
        .filter((employee) => !employee.user)
        .map((employee) => employee.id);

      if (!employeeIdsMissingLinkedUser.length) {
        return employees;
      }

      const fallbackUsers = await this.prisma.user.findMany({
        where: {
          agencyId,
          previousEmployeeId: {
            in: employeeIdsMissingLinkedUser,
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          role: true,
          previousEmployeeId: true,
        },
      });

      const fallbackByEmployeeId = new Map(
        fallbackUsers
          .filter((user) => Boolean(user.previousEmployeeId))
          .map((user) => [user.previousEmployeeId as string, user]),
      );

      return employees.map((employee) => {
        if (employee.user) {
          return employee;
        }

        const fallbackUser = fallbackByEmployeeId.get(employee.id);
        if (!fallbackUser) {
          return employee;
        }

        const { previousEmployeeId, ...userWithoutPreviousEmployeeId } = fallbackUser;
        return {
          ...employee,
          user: userWithoutPreviousEmployeeId,
        };
      });
    } catch (e) {
      this.logger.error('Find Employees Error:', e);
      throw e;
    }
  }

  async resolveTargetRoleNameForPromotion(agencyId: string, targetRoleId?: string) {
    if (!targetRoleId) {
      return 'Agency Admin';
    }

    const targetRole = await this.prisma.role.findUnique({
      where: { id: targetRoleId },
      select: {
        agencyId: true,
        name: true,
      },
    });

    if (!targetRole || targetRole.agencyId !== agencyId) {
      throw new ForbiddenException('Invalid target role for this agency');
    }

    return targetRole.name;
  }

  async resolveCurrentEmployeeRoleName(agencyId: string, employeeId: string) {
    const { user } = await this.getEmployeeWithLinkedUser(agencyId, employeeId);
    return user.role?.name;
  }

  async promoteToAgencyAdmin(agencyId: string, employeeId: string, targetRoleId?: string, requesterRole?: string) {
    const { employee, user } = await this.getEmployeeWithLinkedUser(agencyId, employeeId);

    let roleToAssign: { id: string; name?: string | null };

    if (targetRoleId) {
      const targetRole = await this.prisma.role.findUnique({
        where: { id: targetRoleId },
        select: {
          id: true,
          agencyId: true,
          name: true,
        },
      });

      if (!targetRole || targetRole.agencyId !== agencyId) {
        throw new ForbiddenException('Invalid target role for this agency');
      }

      roleToAssign = { id: targetRole.id, name: targetRole.name };
    } else {
      const adminRole = await this.ensureAgencyAdminRole(agencyId);
      roleToAssign = { id: adminRole.id, name: adminRole.name };
    }

    // If requester is not Agency Admin, target role cannot be Agency Admin
    if (!this.isAgencyAdminRole(requesterRole) && this.isAgencyAdminRole(roleToAssign.name)) {
      throw new ForbiddenException('Only Agency Admin can promote to Agency Admin role');
    }

    const promotingToAgencyAdmin = this.isAgencyAdminRole(roleToAssign.name);
    const switchingToAgencyAdminPortal = promotingToAgencyAdmin && !this.isAgencyAdminRole(user.role?.name);

    if (switchingToAgencyAdminPortal) {
      const adminCount = await this.prisma.user.count({
        where: {
          agencyId,
          role: {
            name: 'Agency Admin',
          },
        },
      });

      if (adminCount >= 2) {
        throw new BadRequestException('This agency already has the maximum of 2 Agency Admins.');
      }
    }

    const updateData: any = {
      roleId: roleToAssign.id,
    };

    if (promotingToAgencyAdmin) {
      updateData.previousEmployeeId = user.previousEmployeeId || user.employeeId || employee.id;
      updateData.employeeId = null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const refreshedUser = await this.findLinkedUserByEmployeeId(agencyId, employee.id);

    const updatedEmployee = {
      ...employee,
      user: refreshedUser,
    };

    return {
      ...updatedEmployee,
      portalSwitch: switchingToAgencyAdminPortal,
      message: switchingToAgencyAdminPortal ? 'Promoted to Agency Admin' : 'Role updated successfully',
    };
  }

  async demoteToStaffRole(agencyId: string, employeeId: string, targetRoleId?: string, requesterRole?: string) {
    const { employee, user } = await this.getEmployeeWithLinkedUser(agencyId, employeeId);

    const currentRole = user.role;

    // If requester is not Agency Admin, cannot demote an Agency Admin
    if (!this.isAgencyAdminRole(requesterRole) && this.isAgencyAdminRole(currentRole?.name)) {
      throw new ForbiddenException('Only Agency Admin can demote an Agency Admin');
    }

    let roleToAssign: { id: string; name?: string | null };

    if (targetRoleId) {
      const targetRole = await this.prisma.role.findUnique({
        where: { id: targetRoleId },
        select: {
          id: true,
          agencyId: true,
          name: true,
        },
      });

      if (!targetRole || targetRole.agencyId !== agencyId) {
        throw new ForbiddenException('Invalid target role for this agency');
      }

      roleToAssign = { id: targetRole.id, name: targetRole.name };
    } else {
      const staffRole = await this.ensureDefaultStaffRole(agencyId);
      roleToAssign = { id: staffRole.id, name: staffRole.name };
    }

    const demotingToStaffPortalRole = !this.isAgencyAdminRole(roleToAssign.name);
    const switchingToStaffPortal = this.isAgencyAdminRole(user.role?.name) && demotingToStaffPortalRole;
    const updateData: any = {
      roleId: roleToAssign.id,
    };

    if (demotingToStaffPortalRole) {
      updateData.employeeId = user.employeeId || user.previousEmployeeId || employee.id;
      updateData.previousEmployeeId = null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const refreshedUser = await this.findLinkedUserByEmployeeId(agencyId, employee.id);

    const updatedEmployee = {
      ...employee,
      user: refreshedUser,
    };

    return {
      ...updatedEmployee,
      portalSwitch: switchingToStaffPortal,
      message: switchingToStaffPortal ? 'Demoted to Staff' : 'Role updated successfully',
    };
  }

  async toggleEmployeeUserSuspension(agencyId: string, employeeId: string) {
    const { employee, user } = await this.getEmployeeWithLinkedUser(agencyId, employeeId);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: !user.isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        employeeId: true,
      },
    });

    return updatedUser;
  }

  async remove(agencyId: string, id: string, userId?: string) {
    try {
      // Find employee first to get name for logs
      const exists = await this.prisma.employee.findUnique({ where: { id } });
      if (!exists) throw new NotFoundException('Employee record not found.');
      if (exists.agencyId !== agencyId) throw new ForbiddenException('Access to this employee is forbidden');
      const employee = exists;

      await this.prisma.$transaction(async (tx) => {
        const linkedUsers = await tx.user.findMany({
          where: {
            agencyId,
            OR: [
              { employeeId: id },
              { previousEmployeeId: id },
            ],
          },
          select: { id: true },
        });

        const linkedUserIds = linkedUsers.map((u) => u.id);

        if (linkedUserIds.length > 0) {
          // Explicitly remove deployment assignments so active/planned deployments
          // do not block termination of a linked user account.
          await tx.deploymentGuard.deleteMany({
            where: {
              agencyId,
              userId: {
                in: linkedUserIds,
              },
            },
          });
        }

        await tx.user.deleteMany({
          where: {
            agencyId,
            OR: [
              { employeeId: id },
              { previousEmployeeId: id },
            ],
          },
        });

        await tx.employee.delete({
          where: { id },
        });
      });

      // Log the action
      await this.auditLogsService.create(
        agencyId,
        {
          action: 'TERMINATE_EMPLOYEE',
          details: `Employee ${employee.fullName} (${employee.employeeCode}) was terminated and record expunged.`,
          severity: 'CRITICAL',
          entity: 'Employee',
          entityId: id,
        },
        userId,
      );

      return {
        success: true,
        message: 'Employee and linked user deleted successfully',
      };
    } catch (error: any) {
      this.logger.error('Remove Employee Error:', error);

      if (error instanceof HttpException) throw error;

      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete this employee because related assignment records still exist. Please clear assignments and try again.',
        );
      }

      throw new InternalServerErrorException(
        `Failed to terminate employee record. Please check for active assignments.`,
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
