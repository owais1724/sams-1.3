import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
    console.log('Adding project permissions to employee roles...');

    // Define project permissions to add
    const projectPermissions = ['view_projects', 'create_project', 'edit_project', 'delete_project'];

    // Ensure all project permissions exist
    for (const action of projectPermissions) {
        await prisma.permission.upsert({
            where: { action },
            update: {},
            create: { action, description: `Permission: ${action}` },
        });
    }

    // Find all non-system roles (employee roles) that are NOT Agency Admin
    const employeeRoles = await prisma.role.findMany({
        where: {
            isSystem: false,
            name: {
                not: 'Agency Admin'
            }
        },
        include: {
            permissions: {
                select: { action: true }
            }
        }
    });

    console.log(`Found ${employeeRoles.length} employee roles to update.`);

    for (const role of employeeRoles) {
        const existingPermissions = role.permissions.map(p => p.action);
        const missingPermissions = projectPermissions.filter(p => !existingPermissions.includes(p));

        if (missingPermissions.length > 0) {
            await prisma.role.update({
                where: { id: role.id },
                data: {
                    permissions: {
                        connect: missingPermissions.map(action => ({ action }))
                    }
                }
            });
            console.log(`Updated role "${role.name}" (${role.id}): Added [${missingPermissions.join(', ')}]`);
        } else {
            console.log(`Role "${role.name}" (${role.id}): Already has all project permissions`);
        }
    }

    console.log('Fix complete!');
}

fix()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
