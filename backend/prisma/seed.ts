import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_AGENCY_ROLE_TEMPLATES = [
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
] as const;

async function seedDefaultAgencyRoles(agencyId: string) {
    for (const template of DEFAULT_AGENCY_ROLE_TEMPLATES) {
        const existingRole = await prisma.role.findFirst({
            where: {
                agencyId,
                name: template.name,
            },
            select: { id: true },
        });

        // Preserve existing role records exactly as they are.
        if (existingRole) {
            continue;
        }

        await prisma.role.create({
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

async function main() {
    console.log('Seeding database...');

    // 1. Create Permissions
    const allPermissions = Array.from(new Set([
        // Platform Level
        'manage_agencies', 'create_agency', 'edit_agency', 'delete_agency',
        'create_agency_admin',
        'view_platform_analytics',

        // Agency Level - Operational
        'view_clients', 'create_client', 'edit_client', 'delete_client',
        'view_projects', 'create_project', 'edit_project', 'delete_project',
        'view_employee', 'create_employee', 'edit_employee', 'delete_employee',
        'manage_roles', // Create/Edit roles
        'assign_staff',
        'view_attendance', 'record_attendance',
        'approve_leave', 'apply_leave', 'view_leaves',
        'manage_payroll', 'view_payroll',
        'view_reports',
        'view_shifts', 'manage_shifts',
        'view_deployments', 'manage_deployments',
        'view_incidents', 'report_incident', 'manage_incidents',
        'view_dashboard',

        ...DEFAULT_AGENCY_ROLE_TEMPLATES.flatMap((template) => template.permissions),
    ]));

    for (const action of allPermissions) {
        await prisma.permission.upsert({
            where: { action },
            update: {},
            create: { action },
        });
    }

    // 2. Create System Roles (agencyId is null)

    // 2a. Super Admin (Platform Owner)
    const platformPermissions = await prisma.permission.findMany({
        where: {
            action: {
                in: ['manage_agencies', 'create_agency', 'edit_agency', 'delete_agency', 'create_agency_admin', 'view_platform_analytics']
            }
        }
    });

    await prisma.role.upsert({
        where: { id: 'super-admin-role' },
        update: {},
        create: {
            id: 'super-admin-role',
            name: 'Super Admin',
            description: 'Platform Owner',
            isSystem: true,
            permissions: {
                connect: platformPermissions.map(p => ({ id: p.id }))
            }
        },
    });

    // 2b. Basic Staff (Operational User)
    const staffPermissions = await prisma.permission.findMany({
        where: {
            action: {
                in: ['record_attendance', 'apply_leave']
            }
        }
    });

    await prisma.role.upsert({
        where: { id: 'system-staff-role' },
        update: {},
        create: {
            id: 'system-staff-role',
            name: 'Staff',
            description: 'Default operational staff role',
            isSystem: true,
            permissions: {
                connect: staffPermissions.map(p => ({ id: p.id }))
            }
        },
    });

    // 3. Create Super Admin User
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash('password123', salt);

    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@sams.com' },
        update: {
            roleId: 'super-admin-role'
        },
        create: {
            email: 'admin@sams.com',
            password,
            fullName: 'SAMS GLOBAL ADMIN',
            roleId: 'super-admin-role',
        }
    });

    const agencies = await prisma.agency.findMany({
        select: { id: true },
    });

    for (const agency of agencies) {
        await seedDefaultAgencyRoles(agency.id);
    }

    console.log('Seeding complete. Master Admin created:', superAdmin.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
