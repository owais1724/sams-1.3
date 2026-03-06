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
      this.logger.log(`Attempting to validate user: ${email}`);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findOne(normalizedEmail);

    if (!user) {
      if (!isProd) {
        this.logger.log(
          `No user found with email: "${normalizedEmail}"`,
        );
      }
      return null;
    }

    const isPasswordMatching = await bcrypt.compare(pass, user.password);
    if (!isPasswordMatching) {
      if (!isProd) {
        this.logger.log(
          `Password mismatch for email: "${normalizedEmail}"`,
        );
      }
      return null;
    }

    // Block login if the agency is deactivated (Super Admins have no agency — always allowed)
    const userWithAgency = user as any;
    if (userWithAgency.agency && !userWithAgency.agency.isActive) {
      if (!isProd) {
        this.logger.warn(`Login blocked — agency is deactivated for: "${normalizedEmail}"`);
      }
      throw new UnauthorizedException('Your agency has been deactivated. Please contact your system administrator.');
    }

    if (!isProd) {
      this.logger.log(
        `Validation successful for: "${normalizedEmail}"`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async login(user: any, clientIp: string = 'unknown') {
    // Fetch user with role and permissions
    const userWithPermissions = await this.usersService.findOneWithPermissions(
      user.email,
    );

    if (!userWithPermissions) {
      throw new UnauthorizedException('User no longer exists');
    }

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

    // Create audit log for login (skip for Super Admin — no agencyId)
    if (userWithPermissions.agencyId) {
      await this.auditLogsService.create(
        userWithPermissions.agencyId,
        {
          action: 'LOGIN',
          details: `User ${userWithPermissions.fullName} logged into the system`,
          metadata: {
            role: userWithPermissions.role?.name,
            ip: clientIp,
          },
          severity: 'INFO',
        },
        userWithPermissions.id,
      );
    }

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
        agencyName: userWithPermissions.agency?.name,
        employeeId: userWithPermissions.employeeId,
      },
    };
  }
}
