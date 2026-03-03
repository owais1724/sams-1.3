import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('You are not authenticated');
    }

    const userRole = typeof user.role === 'string' ? user.role.toLowerCase().trim() : '';
    const isProd = process.env.NODE_ENV === 'production';

    // ── Tier 1: Platform Super Admin bypasses everything ─────────────────────
    // These are the global platform owners/developers who manage the infrastructure.
    if (userRole === 'super admin') {
      return true;
    }

    // ── Tier 2: All other roles (Agency Admin, HR, Guard, etc.) are strictly permission-checked ──
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const userPermissions: string[] = user.permissions || [];

    if (!isProd && process.env.DEBUG_AUTH === 'true') {
      console.log(
        `[PermissionsGuard] ${user.email} (${userRole}) | route: ${request.method} ${request.url}`,
      );
      console.log(`[PermissionsGuard] Required: ${JSON.stringify(requiredPermissions)}`);
      console.log(`[PermissionsGuard] Has: ${JSON.stringify(userPermissions)}`);
    }

    // ── DEFAULT DENY: if no permissions declared on route, block all non-system-admins ──
    if (!requiredPermissions || requiredPermissions.length === 0) {
      if (!isProd) {
        console.warn(
          `[PermissionsGuard] BLOCKED — Route "${context.getHandler().name}" is missing @Permissions() and role is "${userRole}"`,
        );
      }
      throw new ForbiddenException(
        'Security Violation: This action has no defined permissions. Please contact technical support.',
      );
    }

    // ── Check user permissions against required ───────────────────────────────
    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      if (!isProd) {
        console.log(
          `[PermissionsGuard] DENIED for "${user.email}" — required: [${requiredPermissions}], has: [${userPermissions}]`,
        );
      }
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
