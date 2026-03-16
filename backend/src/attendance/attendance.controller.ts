import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

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
  async checkIn(@Request() req, @Body() data: any) {
    return this.attendanceService.checkIn(
      req.user.agencyId,
      req.user.userId,
      data,
    );
  }

  @Post('check-out')
  @Permissions('record_attendance')
  async checkOut(@Request() req, @Body() data: any) {
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
