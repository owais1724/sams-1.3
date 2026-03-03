
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
    console.log('Synchronizing Agency Admin permissions...');

    // 1. Get all operational permissions
    const operationalPermissions = await prisma.permission.findMany({
        where: {
            action: {
                notIn: [
                    'create_agency',
                    'edit_agency',
                    'delete_agency',
                    'create_agency_admin',
                    'view_platform_analytics',
                ]
            }
        }
    });

    const permissionIds = operationalPermissions.map(p => ({ id: p.id }));

    // 2. Find all 'Agency Admin' roles and connect all operational permissions
    const affectedRoles = await prisma.role.findMany({
        where: { name: 'Agency Admin' }
    });

    for (const role of affectedRoles) {
        await prisma.role.update({
            where: { id: role.id },
            data: {
                permissions: {
                    connect: permissionIds
                }
            }
        });
        console.log(`Updated permissions for Agency Admin role: ${role.id} (Agency: ${role.agencyId})`);
    }

    console.log('Fix complete.');
}

fix()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
