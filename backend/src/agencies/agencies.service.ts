import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsSeedService } from '../permissions-seed/permissions-seed.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AgenciesService {
  constructor(
    private prisma: PrismaService,
    private permissionsSeedService: PermissionsSeedService,
  ) { }

  private readonly agencyAdminPermissions = [
    'view_clients', 'create_client', 'edit_client', 'delete_client',
    'view_projects', 'create_project', 'edit_project', 'delete_project',
    'view_employee', 'create_employee', 'edit_employee', 'delete_employee',
    'manage_roles', 'assign_staff', 'view_attendance', 'record_attendance',
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

  private async ensureAgencyAdminRole(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    agencyId: string,
  ) {
    for (const action of this.agencyAdminPermissions) {
      await tx.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      });
    }

    const existingRole = await tx.role.findFirst({
      where: {
        agencyId,
        name: 'Agency Admin',
      },
    });

    if (existingRole) {
      return existingRole;
    }

    return tx.role.create({
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

  private async ensureDefaultStaffRole(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    agencyId: string,
  ) {
    for (const action of this.defaultStaffPermissions) {
      await tx.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      });
    }

    const existingRole = await tx.role.findFirst({
      where: {
        agencyId,
        name: 'Staff',
      },
    });

    if (existingRole) {
      return existingRole;
    }

    return tx.role.create({
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

  private async ensureDemotionEmployeeLink(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    agencyId: string,
    user: {
      id: string;
      fullName: string;
      email: string;
      phoneNumber?: string | null;
    },
    profile: {
      designationId: string | null;
      basicSalary: number;
      salaryCurrency: string;
    },
  ) {
    const baseCode = `ADM-${user.id.slice(-8).toUpperCase()}`;
    let employeeCode = baseCode;
    let attempt = 0;

    // Generate a deterministic but collision-safe code for migrated admin accounts.
    while (true) {
      const exists = await tx.employee.findUnique({
        where: {
          agencyId_employeeCode: {
            agencyId,
            employeeCode,
          },
        },
        select: { id: true },
      });

      if (!exists) {
        break;
      }

      attempt += 1;
      employeeCode = `${baseCode}-${attempt}`;
    }

    const employee = await tx.employee.create({
      data: {
        agencyId,
        fullName: user.fullName || user.email,
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        employeeCode,
        designationId: profile.designationId,
        basicSalary: profile.basicSalary,
        salaryCurrency: profile.salaryCurrency,
      },
      select: { id: true },
    });

    return employee.id;
  }

  private async resolveDemotionEmployeeProfile(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    agencyId: string,
    roleName?: string | null,
  ) {
    const normalizedRole = this.normalizeRoleName(roleName);
    if (!normalizedRole || this.isAgencyAdminRole(roleName)) {
      return {
        designationId: null,
        basicSalary: 0,
        salaryCurrency: 'USD',
      };
    }

    const cleanRoleName = (roleName || '').trim();

    let designation = await tx.designation.findFirst({
      where: {
        agencyId,
        name: {
          equals: cleanRoleName,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (!designation) {
      designation = await tx.designation.create({
        data: {
          agencyId,
          name: cleanRoleName,
          description: `Auto-created designation for role ${cleanRoleName}`,
        },
        select: { id: true },
      });
    }

    const salaryTemplate = await tx.employee.findFirst({
      where: {
        agencyId,
        designationId: designation.id,
        basicSalary: {
          gt: 0,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        basicSalary: true,
        salaryCurrency: true,
      },
    });

    return {
      designationId: designation.id,
      basicSalary: salaryTemplate?.basicSalary || 0,
      salaryCurrency: salaryTemplate?.salaryCurrency || 'USD',
    };
  }

  async createAgency(data: {
    name: string;
    slug: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
    adminPhone?: any;
  }) {
    // 1. Check if agency exists
    const existingAgency = await this.prisma.agency.findUnique({
      where: { slug: data.slug },
    });
    if (existingAgency)
      throw new ConflictException('Agency slug already exists');

    // 2. Check if admin user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingUser) throw new ConflictException('Admin email already in use');

    // 3. Create Agency
    return this.prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: data.name,
          slug: data.slug,
        },
      });

      // 4. Create Agency Admin Role for this agency
      const adminRole = await this.ensureAgencyAdminRole(tx, agency.id);

      // Seed default HR/Supervisor/Guard/Cleaner roles for every new agency.
      await this.permissionsSeedService.seedDefaultRolesForAgency(agency.id, tx);

      // 5. Create Admin User
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
      await tx.user.create({
        data: {
          email: data.adminEmail,
          password: hashedPassword,
          fullName: data.adminName,
          phoneNumber: data.adminPhone ? `${data.adminPhone.countryCode}${data.adminPhone.phoneNumber}` : null,
          agencyId: agency.id,
          roleId: adminRole.id,
        },
      });

      return agency;
    });
  }

  async findBySlug(slug: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { slug },
    });
    if (!agency) throw new NotFoundException('Agency not found');
    return agency;
  }

  async findAll() {
    return this.prisma.agency.findMany({
      include: {
        users: {
          where: { role: { name: 'Agency Admin' } },
        }
      }
    });
  }

  async update(id: string, data: any) {
    const agency = await this.prisma.agency.findUnique({
      where: { id },
      include: { users: { where: { role: { name: 'Agency Admin' } }, take: 1 } },
    });
    if (!agency) throw new NotFoundException('Agency not found');

    if (data.slug && data.slug !== agency.slug) {
      const existing = await this.prisma.agency.findUnique({
        where: { slug: data.slug },
      });
      if (existing) throw new ConflictException('Agency slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Agency Core Details
      const updatedAgency = await tx.agency.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          isActive: data.isActive,
        },
      });

      // 2. Update Agency Admin if provided
      const adminUser = agency.users[0];
      if (adminUser && (data.adminName || data.adminEmail || data.adminPassword)) {
        if (data.adminEmail && data.adminEmail !== adminUser.email) {
          const existingEmail = await tx.user.findUnique({
            where: { email: data.adminEmail },
          });
          if (existingEmail)
            throw new ConflictException('Admin email already in use');
        }

        const userUpdateData: any = {};
        if (data.adminName) userUpdateData.fullName = data.adminName;
        if (data.adminPhone) {
          userUpdateData.phoneNumber = `${data.adminPhone.countryCode}${data.adminPhone.phoneNumber}`;
        }
        if (data.adminEmail) userUpdateData.email = data.adminEmail;
        if (data.adminPassword) {
          userUpdateData.password = await bcrypt.hash(data.adminPassword, 10);
        }

        await tx.user.update({
          where: { id: adminUser.id },
          data: userUpdateData,
        });
      }

      return updatedAgency;
    });
  }

  // DELETE AGENCY — raw SQL cascade (v3 — bypasses all FK constraints by deleting in correct order)
  async remove(id: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id } });
    if (!agency) throw new NotFoundException('Agency not found');

    // Use raw SQL to delete in correct FK dependency order inside a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `DELETE FROM "AuditLog" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Attendance" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Leave" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Payroll" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Visitor" WHERE "agencyId" = $1`, id
      );
      // Delete checkpoints for all projects of this agency
      await tx.$executeRawUnsafe(
        `DELETE FROM "Checkpoint" WHERE "projectId" IN (SELECT id FROM "Project" WHERE "agencyId" = $1)`, id
      );
      // Delete the many-to-many join table _EmployeeToProject
      await tx.$executeRawUnsafe(
        `DELETE FROM "_EmployeeToProject" WHERE "B" IN (SELECT id FROM "Project" WHERE "agencyId" = $1)`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Project" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Client" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "User" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Employee" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Designation" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Role" WHERE "agencyId" = $1`, id
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM "Agency" WHERE id = $1`, id
      );
    });

    return { success: true, id };
  }
  async toggleStatus(id: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id } });
    if (!agency) throw new NotFoundException('Agency not found');

    return this.prisma.agency.update({
      where: { id },
      data: { isActive: !agency.isActive },
    });
  }

  async listAgencyAdmins(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException('Agency not found');

    const admins = await this.prisma.user.findMany({
      where: {
        agencyId,
        OR: [
          {
            role: {
              name: 'Agency Admin',
            },
          },
          {
            employeeId: null,
            roleId: null,
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return admins.map((admin) => ({
      id: admin.id,
      name: admin.fullName,
      email: admin.email,
      isActive: admin.isActive,
      roleName: admin.role?.name || 'Demoted',
    }));
  }

  async listAgencyStaffRoles(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException('Agency not found');

    const roles = await this.prisma.$transaction(async (tx) => {
      await this.ensureDefaultStaffRole(tx, agencyId);

      return tx.role.findMany({
        where: {
          agencyId,
          NOT: {
            name: 'Agency Admin',
          },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    return roles;
  }

  async createAgencyAdmin(
    agencyId: string,
    data: { name: string; email: string; password: string },
  ) {
    if (!data?.name || !data?.email || !data?.password) {
      throw new BadRequestException('name, email and password are required');
    }

    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException('Agency not found');

    const normalizedEmail = data.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      throw new ConflictException('Admin email already in use');
    }

    return this.prisma.$transaction(async (tx) => {
      const adminCount = await tx.user.count({
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

      const adminRole = await this.ensureAgencyAdminRole(tx, agencyId);
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await tx.user.create({
        data: {
          fullName: data.name,
          email: normalizedEmail,
          password: hashedPassword,
          agencyId,
          roleId: adminRole.id,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          agencyId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        ...user,
        name: user.fullName,
      };
    });
  }

  async demoteAgencyAdmin(agencyId: string, userId: string, targetRoleId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.agencyId !== agencyId) {
      throw new NotFoundException('User not found in this agency');
    }

    return this.prisma.$transaction(async (tx) => {
      let roleToAssign: { id: string; name: string };

      if (targetRoleId) {
        const targetRole = await tx.role.findUnique({
          where: { id: targetRoleId },
          select: {
            id: true,
            name: true,
            agencyId: true,
          },
        });

        if (!targetRole || targetRole.agencyId !== agencyId) {
          throw new BadRequestException('Invalid target role for this agency');
        }

        if (this.isAgencyAdminRole(targetRole.name)) {
          throw new BadRequestException('Please select a non-admin role for demotion');
        }

        roleToAssign = {
          id: targetRole.id,
          name: targetRole.name,
        };
      } else {
        const staffRole = await this.ensureDefaultStaffRole(tx, agencyId);
        roleToAssign = {
          id: staffRole.id,
          name: staffRole.name,
        };
      }

      const switchingToStaffPortal =
        this.isAgencyAdminRole(user.role?.name) && !this.isAgencyAdminRole(roleToAssign.name);

      const updateData: any = {
        roleId: roleToAssign.id,
      };

      if (switchingToStaffPortal) {
        const employeeProfile = await this.resolveDemotionEmployeeProfile(
          tx,
          agencyId,
          roleToAssign.name,
        );

        let restoredEmployeeId = user.employeeId || user.previousEmployeeId;
        let existingLinkedEmployee: { id: string } | null = null;

        if (restoredEmployeeId) {
          existingLinkedEmployee = await tx.employee.findFirst({
            where: {
              id: restoredEmployeeId,
              agencyId,
            },
            select: { id: true },
          });

          if (!existingLinkedEmployee) {
            restoredEmployeeId = null;
          }
        }

        if (!restoredEmployeeId) {
          restoredEmployeeId = await this.ensureDemotionEmployeeLink(tx, agencyId, {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
          }, employeeProfile);
        } else {
          await tx.employee.update({
            where: { id: restoredEmployeeId },
            data: {
              designationId: employeeProfile.designationId,
              basicSalary: employeeProfile.basicSalary,
              salaryCurrency: employeeProfile.salaryCurrency,
            },
          });
        }

        updateData.employeeId = restoredEmployeeId;
        updateData.previousEmployeeId = null;
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          agencyId: true,
          employeeId: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      return {
        ...updated,
        roleName: updated.role?.name || null,
      };
    });
  }

  async promoteAgencyAdmin(agencyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.agencyId !== agencyId) {
      throw new NotFoundException('User not found in this agency');
    }

    return this.prisma.$transaction(async (tx) => {
      const alreadyAdmin = user.roleId
        ? await tx.role.findFirst({
          where: {
            id: user.roleId,
            name: 'Agency Admin',
          },
          select: { id: true },
        })
        : null;

      if (!alreadyAdmin) {
        const adminCount = await tx.user.count({
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

      const adminRole = await this.ensureAgencyAdminRole(tx, agencyId);

      const updateData: any = {
        roleId: adminRole.id,
      };

      if (!alreadyAdmin) {
        updateData.previousEmployeeId = user.previousEmployeeId || user.employeeId || null;
        updateData.employeeId = null;
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          agencyId: true,
          employeeId: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      return {
        ...updated,
        roleName: updated.role?.name,
      };
    });
  }

  async deleteAgencyAdmin(agencyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.agencyId !== agencyId) {
      throw new NotFoundException('User not found in this agency');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Agency admin deleted successfully' };
  }

  async toggleAgencyAdminSuspension(agencyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.agencyId !== agencyId) {
      throw new NotFoundException('User not found in this agency');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !user.isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
      },
    });

    return updated;
  }
}
