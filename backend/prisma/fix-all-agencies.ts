import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching all agencies...');
    const agencies = await prisma.agency.findMany();
    console.log('Current agencies:', agencies.map(a => ({ id: a.id, name: a.name, slug: a.slug })));

    for (const agency of agencies) {
        const lowerName = agency.name.toLowerCase();
        const lowerSlug = agency.slug.toLowerCase();

        if (lowerName.includes('senitel') || lowerName.includes('sentinel') ||
            lowerSlug.includes('senitel') || lowerSlug.includes('sentinel')) {

            const newName = agency.name
                .replace(/senitel/gi, 'SAMS')
                .replace(/sentinel/gi, 'SAMS');
            const newSlug = agency.slug
                .replace(/senitel/gi, 'sams')
                .replace(/sentinel/gi, 'sams');

            await prisma.agency.update({
                where: { id: agency.id },
                data: { name: newName, slug: newSlug }
            });
            console.log(`FIXED: "${agency.name}" (${agency.slug}) → "${newName}" (${newSlug})`);
        } else {
            console.log(`OK: "${agency.name}" (${agency.slug})`);
        }
    }

    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
