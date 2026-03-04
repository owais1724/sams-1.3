import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fixing branding and data inconsistencies...');

    // 1. Rename any agency containing "senitel" to "SAMS"
    const agencies = await prisma.agency.findMany({
        where: {
            OR: [
                { name: { contains: 'senitel', mode: 'insensitive' } },
                { slug: { contains: 'senitel', mode: 'insensitive' } },
                { name: { contains: 'sentinel', mode: 'insensitive' } },
                { slug: { contains: 'sentinel', mode: 'insensitive' } }
            ]
        }
    });

    for (const agency of agencies) {
        const oldName = agency.name;
        const newName = oldName.replace(/senitel/gi, 'SAMS').replace(/sentinel/gi, 'SAMS');
        const newSlug = agency.slug.replace(/senitel/gi, 'sams').replace(/sentinel/gi, 'sams');

        await prisma.agency.update({
            where: { id: agency.id },
            data: {
                name: newName,
                slug: newSlug
            }
        });
        console.log(`Updated agency: "${oldName}" -> "${newName}" (${newSlug})`);
    }

    console.log('Database correction complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
