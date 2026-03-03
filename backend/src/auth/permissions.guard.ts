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

    // ── Tier 1: Super Admin bypasses everything ──────────────────────────────
    if (userRole === 'super admin') {
      return true;
    }

    // ── Tier 2: Agency Admin bypasses within their own agency ─────────────────
    if (userRole === 'agency admin') {
      return true;
    }

    // ── Tier 3: All other roles are strictly permission-checked ───────────────
    // Gather required permissions from both controller-level AND handler-level metadata.
    // Handler-level wins (more specific).
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isProd && process.env.DEBUG_AUTH === 'true') {
      console.log(
        `[PermissionsGuard] role="${userRole}" | required=${JSON.stringify(requiredPermissions)} | has=${JSON.stringify(user.permissions)}`,
      );
    }

    // ── DEFAULT DENY: if no permissions declared on route, block non-admins ───
    // This is the secure default — routes must explicitly declare who can access them.
    if (!requiredPermissions || requiredPermissions.length === 0) {
      if (!isProd) {
        console.warn(
          `[PermissionsGuard] BLOCKED — no @Permissions() on route "${context.getHandler().name}", role="${userRole}"`,
        );
      }
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    // ── Check user permissions against required ───────────────────────────────
    const userPermissions: string[] = user.permissions || [];
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
