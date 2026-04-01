import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    this.logger.log('Running permissions seed & migration check...');

    try {
      await this.migrateOldPermissionNames();
      await this.seedPermissions();
      await this.fixAgencyAdminRoles();
      await this.fixSuperAdminRole();
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
    const canonicalPermissions = [
      ...this.PLATFORM_PERMISSIONS,
      ...this.AGENCY_ADMIN_PERMISSIONS,
    ];

    for (const action of canonicalPermissions) {
      await this.prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action, description: `Permission: ${action}` },
      });
    }

    this.logger.log(`Verified ${canonicalPermissions.length} permissions exist.`);
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
}
