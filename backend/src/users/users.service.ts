import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private readonly baseUserSelect = {
    id: true,
    email: true,
    password: true,
    fullName: true,
    isActive: true,
    agencyId: true,
    roleId: true,
    employeeId: true,
    phoneNumber: true,
    role: {
      select: {
        id: true,
        name: true,
        permissions: {
          select: {
            action: true,
          },
        },
      },
    },
    agency: {
      select: {
        id: true,
        slug: true,
        name: true,
        isActive: true,
      },
    },
  } as const;

  async findOne(email: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { email },
      select: this.baseUserSelect,
    });
  }

  async findOneWithPermissions(email: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { email },
      select: this.baseUserSelect,
    });
  }

  async findById(id: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.baseUserSelect,
    });
  }
}
