import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PermissionsSeedService
 *
 * Runs automatically on every server startup via OnModuleInit.
 * Ensures all required permissions exist and all "Agency Admin"
 * roles have the full operational permission set.
 *
 * This is idempotent — safe to run repeatedly.
 */
@Injectable()
export class PermissionsSeedService implements OnModuleInit {
    private readonly logger = new Logger(PermissionsSeedService.name);

    // The canonical set of permissions every Agency Admin must have
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
        this.logger.log('🔐 Running permissions seed check...');
        try {
            await this.seedPermissions();
            await this.fixAgencyAdminRoles();
            this.logger.log('✅ Permissions seed check complete.');
        } catch (err) {
            this.logger.error('❌ Permissions seed check failed', err.stack);
        }
    }

    /**
     * Step 1: Ensure every permission action exists in the Permission table.
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
                this.logger.log(`Role "${role.name}" (agencyId: ${role.agencyId}) ✔ already has all permissions.`);
                continue;
            }

            this.logger.warn(
                `Role "${role.name}" (agencyId: ${role.agencyId}) is missing ${missingActions.length} permissions: [${missingActions.join(', ')}]. Fixing...`,
            );

            await this.prisma.role.update({
                where: { id: role.id },
                data: {
                    permissions: {
                        connect: missingActions.map((action) => ({ action })),
                    },
                },
            });

            this.logger.log(`✅ Fixed role "${role.name}" (agencyId: ${role.agencyId}).`);
        }
    }
}
