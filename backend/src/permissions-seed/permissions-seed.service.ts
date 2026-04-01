import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PermissionsSeedService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsSeedService.name);

  // Map old stale names to new canonical names.
  private readonly PERMISSION_MIGRATIONS: Record<string, string> = {
    view_personnel: 'view_employee',
    create_personnel: 'create_employee',
    edit_personnel: 'edit_employee',
    delete_personnel: 'delete_employee',
    approve_leaves: 'approve_leave',
    view_leave: 'view_leaves',
  };

  // The canonical set of operational permissions every Agency Admin must have.
  private readonly AGENCY_ADMIN_PERMISSIONS = [
    'view_clients', 'create_client', 'edit_client', 'delete_client',
    'view_projects', 'create_project', 'edit_project', 'delete_project',
    'view_employee', 'create_employee', 'edit_employee', 'delete_employee',
    'manage_roles',
    'assign_staff',
    'view_attendance', 'record_attendance',
    'view_leaves', 'apply_leave', 'approve_leave',
    'view_payroll', 'manage_payroll',
    'view_reports',
    'view_shifts', 'manage_shifts',
    'view_deployments', 'manage_deployments',
    'view_incidents', 'report_incident', 'manage_incidents',
    'view_dashboard',
  ];

  private readonly PLATFORM_PERMISSIONS = [
    'manage_agencies',
    'create_agency',
    'edit_agency',
    'delete_agency',
    'create_agency_admin',
    'view_platform_analytics',
  ];

  private readonly DEFAULT_AGENCY_ROLE_TEMPLATES = [
    {
      name: 'HR',
      description: 'Human resources operations role',
      permissions: [
        'view_employee', 'create_employee', 'edit_employee', 'delete_employee',
        'manage_roles',
        'view_shifts', 'manage_shifts',
        'view_deployments', 'manage_deployments',
        'approve_leave', 'apply_leave', 'view_leaves',
        'record_attendance', 'view_attendance',
        'report_incident', 'view_incidents', 'manage_incidents',
        'view_clients',
        'view_dashboard',
        'view_reports',
        'assign_staff',
        'view_payroll',
      ],
    },
    {
      name: 'Supervisor',
      description: 'Supervisor operations role',
      permissions: [
        'view_shifts', 'manage_shifts',
        'view_deployments', 'manage_deployments',
        'approve_leave', 'apply_leave', 'view_leaves',
        'record_attendance', 'view_attendance',
        'report_incident', 'view_incidents', 'manage_incidents',
        'view_clients',
        'view_dashboard',
        'view_reports',
        'assign_staff',
      ],
    },
    {
      name: 'Guard',
      description: 'Guard operations role',
      permissions: [
        'view_shifts',
        'view_deployments',
        'apply_leave', 'view_leaves',
        'record_attendance', 'view_attendance',
        'report_incident', 'view_incidents',
      ],
    },
    {
      name: 'Cleaner',
      description: 'Cleaner operations role',
      permissions: [
        'view_shifts',
        'view_deployments',
        'apply_leave', 'view_leaves',
        'record_attendance', 'view_attendance',
        'report_incident', 'view_incidents',
      ],
    },
  ] as const;

  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    this.logger.log('Running permissions seed & migration check...');

    try {
      await this.migrateOldPermissionNames();
      await this.seedPermissions();
      await this.seedDefaultRolesForExistingAgencies();
      await this.fixAgencyAdminRoles();
      await this.fixSuperAdminRole();
      await this.ensureSuperAdminAccount();
      this.logger.log('Permissions seed & migration complete.');
    } catch (err) {
      this.logger.error('Permissions seed check failed', err.stack);
    }
  }

  private async migrateOldPermissionNames() {
    for (const [oldName, newName] of Object.entries(this.PERMISSION_MIGRATIONS)) {
      const oldPerm = await this.prisma.permission.findUnique({
        where: { action: oldName },
      });

      if (!oldPerm) {
        continue;
      }

      const newPerm = await this.prisma.permission.findUnique({
        where: { action: newName },
      });

      if (newPerm) {
        const rolesWithOld = await this.prisma.role.findMany({
          where: { permissions: { some: { id: oldPerm.id } } },
          select: { id: true },
        });

        for (const role of rolesWithOld) {
          await this.prisma.role.update({
            where: { id: role.id },
            data: {
              permissions: {
                disconnect: { id: oldPerm.id },
                connect: { id: newPerm.id },
              },
            },
          });
        }

        await this.prisma.permission.delete({ where: { id: oldPerm.id } });
        this.logger.log(
          `Migrated: "${oldName}" -> "${newName}" (moved ${rolesWithOld.length} role connections, deleted old).`,
        );
        continue;
      }

      await this.prisma.permission.update({
        where: { id: oldPerm.id },
        data: { action: newName },
      });

      this.logger.log(`Renamed permission: "${oldName}" -> "${newName}".`);
    }
  }

  private async seedPermissions() {
    const roleTemplatePermissions = this.DEFAULT_AGENCY_ROLE_TEMPLATES.flatMap(
      (template) => template.permissions,
    );

    const canonicalPermissions = Array.from(
      new Set([
        ...this.PLATFORM_PERMISSIONS,
        ...this.AGENCY_ADMIN_PERMISSIONS,
        ...roleTemplatePermissions,
      ]),
    );

    for (const action of canonicalPermissions) {
      await this.prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action, description: `Permission: ${action}` },
      });
    }

    this.logger.log(`Verified ${canonicalPermissions.length} permissions exist.`);
  }

  async seedDefaultRolesForAgency(
    agencyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    const requiredActions = Array.from(
      new Set(
        this.DEFAULT_AGENCY_ROLE_TEMPLATES.flatMap((template) => template.permissions),
      ),
    );

    for (const action of requiredActions) {
      await db.permission.upsert({
        where: { action },
        update: {},
        create: { action, description: `Permission: ${action}` },
      });
    }

    for (const template of this.DEFAULT_AGENCY_ROLE_TEMPLATES) {
      const existingRole = await db.role.findFirst({
        where: {
          agencyId,
          name: template.name,
        },
        select: { id: true },
      });

      // Do not modify existing role records.
      if (existingRole) {
        continue;
      }

      await db.role.create({
        data: {
          name: template.name,
          description: template.description,
          isSystem: true,
          agencyId,
          permissions: {
            connect: template.permissions.map((action) => ({ action })),
          },
        },
      });
    }
  }

  private async seedDefaultRolesForExistingAgencies() {
    const agencies = await this.prisma.agency.findMany({
      select: { id: true },
    });

    for (const agency of agencies) {
      await this.seedDefaultRolesForAgency(agency.id);
    }

    this.logger.log(
      `Verified default HR/Supervisor/Guard/Cleaner roles for ${agencies.length} agencies.`,
    );
  }

  private async fixAgencyAdminRoles() {
    const agencyAdminRoles = await this.prisma.role.findMany({
      where: { name: 'Agency Admin' },
      include: { permissions: { select: { action: true } } },
    });

    if (agencyAdminRoles.length === 0) {
      this.logger.warn('No "Agency Admin" roles found in DB.');
      return;
    }

    for (const role of agencyAdminRoles) {
      const existingActions = role.permissions.map((p) => p.action);
      const missingActions = this.AGENCY_ADMIN_PERMISSIONS.filter(
        (action) => !existingActions.includes(action),
      );

      if (missingActions.length === 0) {
        this.logger.log(
          `Role "Agency Admin" (agencyId: ${role.agencyId}) all permissions OK.`,
        );
        continue;
      }

      this.logger.warn(
        `Role "Agency Admin" (agencyId: ${role.agencyId}) missing [${missingActions.join(', ')}]. Fixing...`,
      );

      await this.prisma.role.update({
        where: { id: role.id },
        data: {
          permissions: {
            connect: missingActions.map((action) => ({ action })),
          },
        },
      });

      this.logger.log(`Fixed Agency Admin (agencyId: ${role.agencyId}).`);
    }
  }

  private async fixSuperAdminRole() {
    const superAdminRole = await this.prisma.role.findFirst({
      where: { name: 'Super Admin', agencyId: null },
      include: { permissions: { select: { action: true } } },
    });

    if (!superAdminRole) {
      this.logger.warn('No "Super Admin" role found in DB.');
      return;
    }

    const existingActions = superAdminRole.permissions.map((p) => p.action);
    const missingActions = this.PLATFORM_PERMISSIONS.filter(
      (action) => !existingActions.includes(action),
    );

    if (missingActions.length === 0) {
      this.logger.log('Role "Super Admin" platform permissions OK.');
      return;
    }

    this.logger.warn(
      `Role "Super Admin" missing [${missingActions.join(', ')}]. Fixing...`,
    );

    await this.prisma.role.update({
      where: { id: superAdminRole.id },
      data: {
        permissions: {
          connect: missingActions.map((action) => ({ action })),
        },
      },
    });

    this.logger.log('Fixed Super Admin platform permissions.');
  }

  private async ensureSuperAdminAccount() {
    const configuredEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@sams.com')
      .toLowerCase()
      .trim();
    const configuredPassword = process.env.SUPER_ADMIN_PASSWORD;
    const configuredName = (process.env.SUPER_ADMIN_NAME || 'SAMS GLOBAL ADMIN').trim();

    const superAdminRole = await this.prisma.role.findFirst({
      where: { name: 'Super Admin', agencyId: null },
      select: { id: true },
    });

    if (!superAdminRole) {
      this.logger.warn('Cannot ensure Super Admin account because role "Super Admin" is missing.');
      return;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: configuredEmail },
      select: { id: true },
    });

    if (!existingUser) {
      const bootstrapPassword = configuredPassword || 'password123';
      const hashedPassword = await bcrypt.hash(bootstrapPassword, 10);

      await this.prisma.user.create({
        data: {
          email: configuredEmail,
          password: hashedPassword,
          fullName: configuredName,
          roleId: superAdminRole.id,
          agencyId: null,
          employeeId: null,
          previousEmployeeId: null,
        },
      });

      this.logger.log(`Created Super Admin account: ${configuredEmail}`);
      return;
    }

    const updateData: any = {
      roleId: superAdminRole.id,
      agencyId: null,
      employeeId: null,
      previousEmployeeId: null,
      fullName: configuredName,
    };

    if (configuredPassword) {
      updateData.password = await bcrypt.hash(configuredPassword, 10);
      this.logger.log('Super Admin password synced from SUPER_ADMIN_PASSWORD.');
    } else if (process.env.NODE_ENV === 'production') {
      this.logger.warn('SUPER_ADMIN_PASSWORD is not set; existing Super Admin password was kept as-is.');
    }

    await this.prisma.user.update({
      where: { email: configuredEmail },
      data: updateData,
    });

    this.logger.log(`Verified Super Admin account: ${configuredEmail}`);
  }
}
