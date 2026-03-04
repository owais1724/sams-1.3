import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PermissionsSeedService
 *
 * Runs automatically on every server startup via OnModuleInit.
 * 1. Migrates stale old permission names (view_personnel → view_employee, etc.)
 * 2. Ensures all canonical permissions exist in the DB
 * 3. Fixes all Agency Admin roles to have the full operational permission set
 *
 * This is fully idempotent — safe to run repeatedly.
 */
@Injectable()
export class PermissionsSeedService implements OnModuleInit {
    private readonly logger = new Logger(PermissionsSeedService.name);

    // Map old stale names → new correct names
    private readonly PERMISSION_MIGRATIONS: Record<string, string> = {
        'view_personnel': 'view_employee',
        'create_personnel': 'create_employee',
        'edit_personnel': 'edit_employee',
        'delete_personnel': 'delete_employee',
        'approve_leaves': 'approve_leave',
        'view_leave': 'view_leaves',
    };

    // The canonical set of operational permissions every Agency Admin must have
    private readonly AGENCY_ADMIN_PERMISSIONS = [
        // Clients
        'view_clients', 'create_client', 'edit_client', 'delete_client',
        // Projects
        'view_projects', 'create_project', 'edit_project', 'delete_project',
        // Employees
        'view_employee', 'create_employee', 'edit_employee', 'delete_employee',
        // Roles & Designations
        'manage_roles',
        // Staff Assignment
        'assign_staff',
        // Attendance
        'view_attendance', 'mark_attendance',
        // Leaves
        'view_leaves', 'apply_leave', 'approve_leave',
        // Payroll
        'view_payroll', 'manage_payroll',
        // Reports
        'view_reports',
    ];

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        this.logger.log('🔐 Running permissions seed & migration check...');
        try {
            await this.migrateOldPermissionNames();
            await this.seedPermissions();
            await this.fixAgencyAdminRoles();
            this.logger.log('✅ Permissions seed & migration complete.');
        } catch (err) {
            this.logger.error('❌ Permissions seed check failed', err.stack);
        }
    }

    /**
     * Step 0: Rename old stale permission action names to new canonical names.
     * Handles role re-connections automatically.
     */
    private async migrateOldPermissionNames() {
        for (const [oldName, newName] of Object.entries(this.PERMISSION_MIGRATIONS)) {
            const oldPerm = await this.prisma.permission.findUnique({ where: { action: oldName } });
            if (!oldPerm) continue;

            const newPerm = await this.prisma.permission.findUnique({ where: { action: newName } });

            if (newPerm) {
                // New perm already exists — move all role connections from old to new, then delete old
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
                this.logger.log(`Migrated: "${oldName}" → "${newName}" (moved ${rolesWithOld.length} role connections, deleted old).`);
            } else {
                // New perm doesn't exist — just rename the old one in place
                await this.prisma.permission.update({
                    where: { id: oldPerm.id },
                    data: { action: newName },
                });
                this.logger.log(`Renamed permission: "${oldName}" → "${newName}".`);
            }
        }
    }

    /**
     * Step 1: Ensure every canonical permission action exists in the Permission table.
     */
    private async seedPermissions() {
        for (const action of this.AGENCY_ADMIN_PERMISSIONS) {
            await this.prisma.permission.upsert({
                where: { action },
                update: {},
                create: { action, description: `Permission: ${action}` },
            });
        }
        this.logger.log(`Verified ${this.AGENCY_ADMIN_PERMISSIONS.length} permissions exist.`);
    }

    /**
     * Step 2: Find all Agency Admin roles and connect any missing permissions.
     */
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
                (a) => !existingActions.includes(a),
            );

            if (missingActions.length === 0) {
                this.logger.log(`Role "Agency Admin" (agencyId: ${role.agencyId}) ✔ all permissions OK.`);
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

            this.logger.log(`✅ Fixed Agency Admin (agencyId: ${role.agencyId}).`);
        }
    }
}
