import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('init-database')
  async initDatabase() {
    try {
      // Run db push to create tables
      const { stdout, stderr } = await execAsync(
        'npx prisma db push --accept-data-loss --skip-generate',
      );

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
  async seedDatabase() {
    try {
      const { stdout, stderr } = await execAsync('npm run script:seed');

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
