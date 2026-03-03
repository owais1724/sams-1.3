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
    if (userRole === 'super admin') {
      return true;
    }

    // ── Tier 2: Permission Enforcement ────────────────────────────────────────
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const userPermissions: string[] = user.permissions || [];

    // Detailed debug output for the user's terminal
    if (!isProd) {
      console.log(`[RBAC] User: ${user.email} | Role: ${userRole}`);
      console.log(`[RBAC] Route: ${request.method} ${request.url}`);
      console.log(`[RBAC] Required: ${JSON.stringify(requiredPermissions)}`);

      const hasPermission = !requiredPermissions || requiredPermissions.length === 0
        ? false
        : requiredPermissions.some(p => userPermissions.includes(p));

      if (!hasPermission) {
        console.error(`[RBAC] ACCESS DENIED — User lacks required privileges.`);
      } else {
        console.log(`[RBAC] ACCESS GRANTED.`);
      }
    }

    // Default Deny if no permissions specified
    if (!requiredPermissions || requiredPermissions.length === 0) {
      throw new ForbiddenException('Access Denied: Unprotected Resource');
    }

    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException(`Access Denied: Missing ${requiredPermissions.join(' or ')}`);
    }

    return true;
  }
}
