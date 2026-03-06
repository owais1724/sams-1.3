import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) { }

  private readonly logger = new Logger(RolesService.name);

  private logError(error: any) {
    this.logger.error(error.message, error.stack);
  }

  // Permissions that are platform-level (Super Admin only) and must NEVER
  // appear in the agency RBAC role editor.
  private readonly PLATFORM_ONLY_PERMISSIONS = [
    'create_agency',
    'edit_agency',
    'delete_agency',
    'view_agencies',
    'create_agency_admin',
    'edit_agency_admin',
    'delete_agency_admin',
    'view_audit_logs_platform',
  ];

  async findAllPermissions() {
    try {
      return await this.prisma.permission.findMany({
        where: {
          NOT: { action: { in: this.PLATFORM_ONLY_PERMISSIONS } },
        },
        orderBy: { action: 'asc' },
      });
    } catch (e) {
      this.logError(e);
      throw e;
    }
  }

  async findAllRoles(agencyId: string) {
    try {
      return await this.prisma.role.findMany({
        where: {
          agencyId: agencyId,
        },
        include: {
          permissions: true,
          _count: {
            select: { users: true },
          },
        },
      });
    } catch (e) {
      this.logError(e);
      throw e;
    }
  }

  async createRole(
    agencyId: string,
    data: { name: string; description?: string; permissionIds: string[] },
  ) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        agencyId,
        isSystem: false,
        permissions: {
          connect: data.permissionIds.map((id) => ({ id })),
        },
      },
      include: { permissions: true },
    });
  }

  async updateRole(
    agencyId: string,
    roleId: string,
    data: { name?: string; description?: string; permissionIds?: string[] },
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role || role.agencyId !== agencyId) {
      throw new NotFoundException('Role not found');
    }

    // Block ALL modifications to system roles
    if (role.isSystem) {
      throw new ForbiddenException('Cannot modify system roles');
    }

    // For custom roles, allow all updates
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissionIds
          ? {
            set: data.permissionIds.map((id) => ({ id })),
          }
          : undefined,
      },
      include: { permissions: true },
    });
  }

  async removeRole(agencyId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });

    if (!role || role.agencyId !== agencyId) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete system roles');
    }
    if (role._count.users > 0) {
      throw new ForbiddenException('Cannot delete role with assigned users');
    }

    return this.prisma.role.delete({ where: { id: roleId } });
  }
}
