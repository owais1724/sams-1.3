import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Res,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) { }

  private getCookieOptions(isProd: boolean, httpOnly: boolean): CookieOptions {
    return {
      httpOnly,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    };
  }

  private getCsrfCookieOptions(isProd: boolean): CookieOptions {
    return {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    };
  }

  private generateCsrfToken() {
    return randomBytes(32).toString('hex');
  }

  private setCsrfCookie(res: Response, isProd: boolean, token?: string) {
    const csrfToken = token ?? this.generateCsrfToken();

    res.cookie('csrf_token', csrfToken, this.getCsrfCookieOptions(isProd));
    return csrfToken;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      this.logger.log(
        `Login attempt for user: ${req.user?.email}`,
      );
    }

    // Safely extract client IP from x-forwarded-for
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = req.ip
      || (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim())
      || 'unknown';

    const { access_token, user } = await this.authService.login(
      req.user,
      clientIp,
    );

    // Set HTTP-only cookie
    if (!isProd) {
      this.logger.log(`Setting cookie. Prod mode: ${isProd}`);
    }

    res.cookie('access_token', access_token, this.getCookieOptions(isProd, true));
    this.setCsrfCookie(res, isProd);

    if (!isProd) {
      this.logger.log(
        `Cookie set successfully for user: ${user.email}`,
      );
    }
    return { user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = this.getCookieOptions(isProd, true);
    const csrfCookieOptions = this.getCsrfCookieOptions(isProd);
    if (!isProd) {
      this.logger.log('[AuthController] Logout called');
    }

    // Clear the cookie with identical options to how it was set
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('csrf_token', csrfCookieOptions);

    // Also set it to an empty value and expired date for maximum compatibility
    res.cookie('access_token', '', {
      ...cookieOptions,
      path: '/',
      expires: new Date(0),
    });
    res.cookie('csrf_token', '', {
      ...csrfCookieOptions,
      path: '/',
      expires: new Date(0),
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req, @Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!req.cookies?.csrf_token) {
      this.setCsrfCookie(res, isProd);
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req, @Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!req.cookies?.csrf_token) {
      this.setCsrfCookie(res, isProd);
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const user = await this.usersService.findOneWithPermissions(req.user.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleName: string = user.role?.name || '';
    const isSuperAdmin = ['super admin', 'superadmin', 'platform admin'].includes(
      roleName.toLowerCase().trim()
    );

    // Platform-level permissions are ONLY for Super Admins.
    // Strip them from the response for everyone else so they can never
    // appear in the staff dashboard or be used to bypass guards.
    const PLATFORM_ONLY = [
      'create_agency', 'edit_agency', 'delete_agency', 'view_agencies',
      'create_agency_admin', 'edit_agency_admin', 'delete_agency_admin',
      'view_audit_logs_platform',
    ];

    const allPerms: string[] = user.role?.permissions?.map((p: any) => p.action) || [];
    const permissions = isSuperAdmin
      ? allPerms
      : allPerms.filter((p) => !PLATFORM_ONLY.includes(p));

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName || 'Unknown',
      role: roleName || 'No Role',
      permissions,
      agencyId: user.agencyId,
      agencySlug: user.agency?.slug,
      agencyName: user.agency?.name,
      employeeId: user.employeeId,
    };
  }
}
