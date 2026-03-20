import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Controller('attendance')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Permissions('view_attendance', 'record_attendance')
  async findAll(
    @Request() req,
    @Query('today') today?: string,
    @Query('employeeId') employeeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // If not a manager, restrict to own records only
    const role = req.user.role?.toLowerCase() || '';
    const isManager =
      role.includes('admin') ||
      role.includes('hr') ||
      role.includes('supervisor');

    let targetEmployeeId = employeeId;
    if (!isManager && req.user.employeeId) {
      targetEmployeeId = req.user.employeeId;
    }

    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    return this.attendanceService.findAll(
      req.user.agencyId,
      today === 'true',
      targetEmployeeId,
      pageNum,
      limitNum,
    );
  }

  @Post('check-in')
  @Permissions('record_attendance')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async checkIn(@Request() req, @Body() data: CheckInDto) {
    // Additional validation: at least one of projectId or deploymentId must be provided
    if (!data.projectId && !data.deploymentId) {
      throw new BadRequestException('Either projectId or deploymentId is required for check-in');
    }

    return this.attendanceService.checkIn(
      req.user.agencyId,
      req.user.userId,
      data,
    );
  }

  @Post('check-out')
  @Permissions('record_attendance')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async checkOut(@Request() req, @Body() data: CheckOutDto) {
    // Additional validation: at least one of projectId or deploymentId must be provided
    if (!data.projectId && !data.deploymentId) {
      throw new BadRequestException('Either projectId or deploymentId is required for check-out');
    }

    return this.attendanceService.checkOut(
      req.user.agencyId,
      req.user.userId,
      data,
    );
  }

  @Post('detect-absent')
  @Permissions('view_attendance')
  async detectAbsent(@Request() req) {
    return this.attendanceService.detectAbsent(req.user.agencyId);
  }
}
