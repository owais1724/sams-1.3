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

    // ── Tier 1: Super Admins bypass all permission checks ───
    // Super Admins own the platform — they should never be blocked.
    // Agency Admins and Staff are now evaluated based on their actual JWT permissions.
    const isPlatformAdmin = [
      'super admin', 'superadmin', 'platform admin'
    ].includes(userRole);

    if (isPlatformAdmin) {
      if (!isProd) console.log(`[RBAC] Platform Admin Bypass Active for ${user.email} (role: ${userRole})`);
      return true;
    }

    // ── Tier 2: Permission Enforcement ────────────────────────────────────────
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions specified on the route - ALLOW if authenticated
    // (We previously had 'Unprotected Resource' which was too strict for base pages)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      if (!isProd) console.log(`[RBAC] No specific permissions required for this route.`);
      return true;
    }

    const userPermissions: string[] = user.permissions || [];

    // Detailed debug output for the user's terminal
    if (!isProd) {
      console.log(`[RBAC] User: ${user.email} | Role: ${userRole}`);
      console.log(`[RBAC] Route: ${request.method} ${request.url}`);
      console.log(`[RBAC] Required: ${JSON.stringify(requiredPermissions)}`);
      console.log(`[RBAC] User Has: ${JSON.stringify(userPermissions)}`);
    }

    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      if (!isProd) console.error(`[RBAC] ACCESS DENIED — User lacks: ${requiredPermissions.join(' or ')}`);
      throw new ForbiddenException(`Access Denied: Missing ${requiredPermissions.join(' or ')}`);
    }

    if (!isProd) console.log(`[RBAC] ACCESS GRANTED.`);
    return true;
  }
}
