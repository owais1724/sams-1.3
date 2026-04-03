import { Controller, Get, Post, ForbiddenException, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Request } from 'express';

const execFileAsync = promisify(execFile);

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @SkipThrottle()
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  private assertMaintenanceAccess(req: Request) {
    const enabled = process.env.ENABLE_MAINTENANCE_ENDPOINTS === 'true';
    if (!enabled) {
      throw new ForbiddenException('Maintenance endpoints are disabled');
    }

    const expectedToken = process.env.MAINTENANCE_TOKEN;
    if (!expectedToken) {
      throw new ForbiddenException('Maintenance token is not configured');
    }

    const providedHeader = req.headers['x-maintenance-token'];
    const providedToken = Array.isArray(providedHeader)
      ? providedHeader[0]
      : providedHeader;

    if (!providedToken || providedToken !== expectedToken) {
      throw new ForbiddenException('Invalid maintenance token');
    }
  }

  @Post('init-database')
  async initDatabase(@Req() req: Request) {
    this.assertMaintenanceAccess(req);

    try {
      // Run db push to create tables
      const { stdout, stderr } = await execFileAsync('npx', [
        'prisma',
        'db',
        'push',
        '--accept-data-loss',
        '--skip-generate',
      ]);

      return {
        success: true,
        message: 'Database initialized successfully',
        stdout,
        stderr,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database initialization failed',
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }
  }

  @Post('seed-database')
  async seedDatabase(@Req() req: Request) {
    this.assertMaintenanceAccess(req);

    try {
      const { stdout, stderr } = await execFileAsync('npm', ['run', 'script:seed']);

      return {
        success: true,
        message: 'Database seeded successfully',
        stdout,
        stderr,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database seeding failed',
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }
  }
}
