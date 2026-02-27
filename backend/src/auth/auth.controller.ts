import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
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

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      console.log(
        `[AuthController] Login attempt for user: ${req.user?.email}`,
      );
    }

    const { access_token, user } = await this.authService.login(req.user);

    // Set HTTP-only cookie
    if (!isProd) {
      console.log(`[AuthController] Setting cookie. Prod mode: ${isProd}`);
    }

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
    });

    if (!isProd) {
      console.log(
        `[AuthController] Cookie set successfully for user: ${user.email}`,
      );
    }
    return { user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      this.logger.log('[AuthController] Logout called');
    }

    // Clear the cookie with identical options to how it was set
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });

    // Also set it to an empty value and expired date for maximum compatibility
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      expires: new Date(0),
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req, @Res({ passthrough: true }) res: Response) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req, @Res({ passthrough: true }) res: Response) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const user = await this.usersService.findOneWithPermissions(req.user.email);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName || 'Unknown',
      role: user.role?.name || 'No Role',
      permissions: user.role?.permissions?.map((p: any) => p.action) || [],
      agencyId: user.agencyId,
      agencySlug: user.agency?.slug,
      employeeId: user.employeeId,
    };
  }
}
