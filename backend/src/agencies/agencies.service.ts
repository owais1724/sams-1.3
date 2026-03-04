import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AgenciesService {
  constructor(private prisma: PrismaService) { }

  async createAgency(data: {
    name: string;
    slug: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
    adminPhone?: any;
  }) {
    // 1. Check if agency exists
    const existingAgency = await this.prisma.agency.findUnique({
      where: { slug: data.slug },
    });
    if (existingAgency)
      throw new ConflictException('Agency slug already exists');

    // 2. Check if admin user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingUser) throw new ConflictException('Admin email already in use');

    // 3. Create Agency
    return this.prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: data.name,
          slug: data.slug,
        },
      });

      // 4. Create Agency Admin Role for this agency
      const allOperationalPermissions = [
        'view_clients', 'create_client', 'edit_client', 'delete_client',
        'view_projects', 'create_project', 'edit_project', 'delete_project',
        'view_employee', 'create_employee', 'edit_employee', 'delete_employee',
        'manage_roles', 'assign_staff', 'view_attendance', 'mark_attendance',
        'approve_leave', 'apply_leave', 'view_leaves', 'manage_payroll',
        'view_payroll', 'view_reports'
      ];

      // Ensure they exist in the DB
      for (const action of allOperationalPermissions) {
        await tx.permission.upsert({
          where: { action },
          update: {},
          create: { action },
        });
      }

      const adminRole = await tx.role.create({
        data: {
          name: 'Agency Admin',
          description: 'Full control of the agency',
          isSystem: true,
          agencyId: agency.id,
          permissions: {
            connect: allOperationalPermissions.map(action => ({ action })),
          },
        },
      });

      // 5. Create Admin User
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
      await tx.user.create({
        data: {
          email: data.adminEmail,
          password: hashedPassword,
          fullName: data.adminName,
          phoneNumber: data.adminPhone ? `${data.adminPhone.countryCode}${data.adminPhone.phoneNumber}` : null,
          agencyId: agency.id,
          roleId: adminRole.id,
        },
      });

      return agency;
    });
  }

  async findBySlug(slug: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { slug },
    });
    if (!agency) throw new NotFoundException('Agency not found');
    return agency;
  }

  async findAll() {
    return this.prisma.agency.findMany({
      include: {
        users: {
          where: { role: { name: 'Agency Admin' } },
        }
      }
    });
  }

  async update(id: string, data: any) {
    const agency = await this.prisma.agency.findUnique({
      where: { id },
      include: { users: { where: { role: { name: 'Agency Admin' } }, take: 1 } },
    });
    if (!agency) throw new NotFoundException('Agency not found');

    if (data.slug && data.slug !== agency.slug) {
      const existing = await this.prisma.agency.findUnique({
        where: { slug: data.slug },
      });
      if (existing) throw new ConflictException('Agency slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Agency Core Details
      const updatedAgency = await tx.agency.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          isActive: data.isActive,
        },
      });

      // 2. Update Agency Admin if provided
      const adminUser = agency.users[0];
      if (adminUser && (data.adminName || data.adminEmail || data.adminPassword)) {
        if (data.adminEmail && data.adminEmail !== adminUser.email) {
          const existingEmail = await tx.user.findUnique({
            where: { email: data.adminEmail },
          });
          if (existingEmail)
            throw new ConflictException('Admin email already in use');
        }

        const userUpdateData: any = {};
        if (data.adminName) userUpdateData.fullName = data.adminName;
        if (data.adminPhone) {
          userUpdateData.phoneNumber = `${data.adminPhone.countryCode}${data.adminPhone.phoneNumber}`;
        }
        if (data.adminEmail) userUpdateData.email = data.adminEmail;
        if (data.adminPassword) {
          userUpdateData.password = await bcrypt.hash(data.adminPassword, 10);
        }

        await tx.user.update({
          where: { id: adminUser.id },
          data: userUpdateData,
        });
      }

      return updatedAgency;
    });
  }

  async remove(id: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id } });
    if (!agency) throw new NotFoundException('Agency not found');

    // With cascade delete in the schema, we can simply delete the agency and Prisma/Postgres handles the rest
    return this.prisma.agency.delete({ where: { id } });
  }
  async toggleStatus(id: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id } });
    if (!agency) throw new NotFoundException('Agency not found');

    return this.prisma.agency.update({
      where: { id },
      data: { isActive: !agency.isActive },
    });
  }
}
