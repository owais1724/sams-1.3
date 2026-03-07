import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { UsersService } from '../users/users.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('You are not authenticated');
    }

    const userRole = typeof user.role === 'string' ? user.role.toLowerCase().trim() : '';
    const isProd = process.env.NODE_ENV === 'production';

    // ── Tier 1: Super Admins bypass all permission checks ───
    const isPlatformAdmin = [
      'super admin', 'superadmin', 'platform admin'
    ].includes(userRole);

    if (isPlatformAdmin) {
      if (!isProd) this.logger.log(`[RBAC] Platform Admin Bypass Active for ${user.email} (role: ${userRole})`);
      return true;
    }

    // ── Tier 1b: Agency Admins bypass permission checks within their agency ───
    // Agency Admins have full access to their agency's data (scoped by agencyId in services).
    const isAgencyAdmin = [
      'agency admin', 'agencyadmin'
    ].includes(userRole);

    if (isAgencyAdmin) {
      if (!isProd) this.logger.log(`[RBAC] Agency Admin Bypass Active for ${user.email} (role: ${userRole})`);
      return true;
    }

    // ── Tier 2: Permission Enforcement ────────────────────────────────────────
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions specified on the route - ALLOW if authenticated
    if (!requiredPermissions || requiredPermissions.length === 0) {
      if (!isProd) this.logger.log(`[RBAC] No specific permissions required for this route.`);
      return true;
    }

    // ── Fetch LIVE permissions from DB instead of stale JWT ───
    // This ensures that when an admin updates a role's permissions via RBAC,
    // the changes take effect immediately without requiring the user to re-login.
    let userPermissions: string[] = [];
    try {
      const freshUser = await this.usersService.findById(user.userId);
      if (freshUser && (freshUser as any).role?.permissions) {
        userPermissions = (freshUser as any).role.permissions.map((p: any) => p.action);
      }
    } catch {
      // Fallback to JWT permissions if DB query fails
      userPermissions = user.permissions || [];
    }

    // Detailed debug output for the user's terminal
    if (!isProd) {
      this.logger.log(`[RBAC] User: ${user.email} | Role: ${userRole}`);
      this.logger.log(`[RBAC] Route: ${request.method} ${request.url}`);
      this.logger.log(`[RBAC] Required: ${JSON.stringify(requiredPermissions)}`);
      this.logger.log(`[RBAC] User Has (live): ${JSON.stringify(userPermissions)}`);
    }

    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      if (!isProd) this.logger.error(`[RBAC] ACCESS DENIED — User lacks required permissions`);
      throw new ForbiddenException('Access Denied: Insufficient permissions');
    }

    if (!isProd) this.logger.log(`[RBAC] ACCESS GRANTED.`);
    return true;
  }
}
