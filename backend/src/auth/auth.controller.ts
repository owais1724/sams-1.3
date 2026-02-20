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
  ) {}

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
      sameSite: isProd ? 'strict' : 'lax',
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
      console.log('[AuthController] Logout called');
    }

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req) {
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
