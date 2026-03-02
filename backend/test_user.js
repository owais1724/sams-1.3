const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'admin@sams.com' }, include: { role: true } })
    .then(console.log)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
