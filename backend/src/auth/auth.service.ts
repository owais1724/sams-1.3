import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditLogsService: AuditLogsService,
  ) { }

  private readonly logger = new Logger(AuthService.name);

  async validateUser(email: string, pass: string): Promise<any> {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      console.log(`[AuthService] Attempting to validate user: ${email}`);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findOne(normalizedEmail);

    if (!user) {
      if (!isProd) {
        console.log(
          `[AuthService] No user found with email: "${normalizedEmail}"`,
        );
      }
      return null;
    }

    const isPasswordMatching = await bcrypt.compare(pass, user.password);
    if (!isPasswordMatching) {
      if (!isProd) {
        console.log(
          `[AuthService] Password mismatch for email: "${normalizedEmail}"`,
        );
      }
      return null;
    }

    if (!isProd) {
      console.log(
        `[AuthService] Validation successful for: "${normalizedEmail}"`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    // Fetch user with role and permissions
    const userWithPermissions = await this.usersService.findOneWithPermissions(
      user.email,
    );

    const payload = {
      email: userWithPermissions.email,
      sub: userWithPermissions.id,
      agencyId: userWithPermissions.agencyId,
      agencySlug: userWithPermissions.agency?.slug || null,
      employeeId: userWithPermissions.employeeId,
      role: userWithPermissions.role?.name,
      permissions:
        userWithPermissions.role?.permissions?.map((p: any) => p.action) || [],
    };

    // Create audit log for login
    await this.auditLogsService.create(
      userWithPermissions.agencyId,
      {
        action: 'LOGIN',
        details: `User ${userWithPermissions.fullName} logged into the system`,
        metadata: {
          role: userWithPermissions.role?.name,
          ip: 'CLIENT_IP_PLACEHOLDER', // In a real scenario, you'd pass the actual IP
        },
        severity: 'INFO',
      },
      userWithPermissions.id,
    );

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userWithPermissions.id,
        email: userWithPermissions.email,
        fullName: userWithPermissions.fullName,
        role: userWithPermissions.role?.name,
        permissions: payload.permissions,
        agencyId: userWithPermissions.agencyId,
        agencySlug: userWithPermissions.agency?.slug,
        employeeId: userWithPermissions.employeeId,
      },
    };
  }
}
