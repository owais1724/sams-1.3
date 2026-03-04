import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('--- DATABASE STATUS ---');
    console.log('Agencies:', await prisma.agency.count());
    const agencies = await prisma.agency.findMany({ take: 5 });
    console.log('Agency Slugs:', agencies.map(a => a.slug));
    console.log('Employees:', await prisma.employee.count());
    console.log('Attendances:', await prisma.attendance.count());
    console.log('Users:', await prisma.user.count());
    console.log('-----------------------');
}
main().catch(console.error).finally(() => prisma.$disconnect());
