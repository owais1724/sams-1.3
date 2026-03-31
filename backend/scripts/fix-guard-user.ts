import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for users without employeeId who should be staff...\n');

  // Find all users with a role that's not admin but no employeeId
  const usersWithoutEmployeeId = await prisma.user.findMany({
    where: {
      employeeId: null,
      role: {
        name: {
          notIn: ['Super Admin', 'Agency Admin', 'Admin'],
        },
      },
    },
    include: {
      role: true,
      agency: true,
    },
  });

  console.log(`Found ${usersWithoutEmployeeId.length} users without employeeId:\n`);

  for (const user of usersWithoutEmployeeId) {
    console.log(`User: ${user.email}`);
    console.log(`  Role: ${user.role?.name}`);
    console.log(`  Agency: ${user.agency?.name}`);
    console.log(`  Full Name: ${user.fullName}`);

    // Check if an employee record exists with the same email
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        email: user.email,
        agencyId: user.agencyId,
      },
    });

    if (existingEmployee) {
      console.log(`  ✅ Employee record found: ${existingEmployee.id}`);
      console.log(`  Linking user to employee...`);

      await prisma.user.update({
        where: { id: user.id },
        data: { employeeId: existingEmployee.id },
      });

      console.log(`  ✅ User linked to employee successfully!\n`);
    } else {
      console.log(`  ⚠️  No employee record found`);
      console.log(`  Creating employee record...`);

      // Get designation for the role
      const designation = await prisma.designation.findFirst({
        where: {
          name: user.role?.name,
          agencyId: user.agencyId,
        },
      });

      if (!designation) {
        console.log(`  ❌ No designation found for role: ${user.role?.name}`);
        console.log(`  Skipping this user...\n`);
        continue;
      }

      // Generate employee code
      const count = await prisma.employee.count({
        where: { agencyId: user.agencyId },
      });
      const employeeCode = `EMP${String(count + 1).padStart(4, '0')}`;

      // Create employee record
      const newEmployee = await prisma.employee.create({
        data: {
          fullName: user.fullName || 'Unknown',
          employeeCode: employeeCode,
          email: user.email,
          phoneNumber: user.phoneNumber || '',
          status: 'ACTIVE',
          basicSalary: 0,
          salaryCurrency: 'USD',
          agencyId: user.agencyId!,
          designationId: designation.id,
        },
      });

      console.log(`  ✅ Employee created: ${newEmployee.id}`);
      console.log(`  Linking user to employee...`);

      await prisma.user.update({
        where: { id: user.id },
        data: { employeeId: newEmployee.id },
      });

      console.log(`  ✅ User linked to employee successfully!\n`);
    }
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
