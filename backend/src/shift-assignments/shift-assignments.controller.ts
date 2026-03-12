import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('shift-assignments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ShiftAssignmentsController {
  constructor(
    private readonly shiftAssignmentsService: ShiftAssignmentsService,
  ) {}

  @Get()
  @Permissions('view_shifts')
  findAll(
    @Request() req,
    @Query('date') date?: string,
    @Query('employeeId') employeeId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: string,
  ) {
    return this.shiftAssignmentsService.findAll(req.user.agencyId, {
      date,
      employeeId,
      shiftId,
      status,
    });
  }

  @Post()
  @Permissions('manage_shifts')
  create(
    @Request() req,
    @Body()
    data: {
      shiftId: string;
      employeeId: string;
      date: string;
      projectId?: string;
      notes?: string;
    },
  ) {
    return this.shiftAssignmentsService.create(req.user.agencyId, data);
  }

  @Post('bulk')
  @Permissions('manage_shifts')
  bulkCreate(
    @Request() req,
    @Body()
    data: {
      shiftId: string;
      employeeIds: string[];
      date: string;
      projectId?: string;
    },
  ) {
    return this.shiftAssignmentsService.bulkCreate(req.user.agencyId, data);
  }

  @Post(':id/check-in')
  @Permissions('view_shifts')
  checkIn(@Request() req, @Param('id') id: string) {
    return this.shiftAssignmentsService.checkIn(req.user.agencyId, id);
  }

  @Post(':id/check-out')
  @Permissions('view_shifts')
  checkOut(@Request() req, @Param('id') id: string) {
    return this.shiftAssignmentsService.checkOut(req.user.agencyId, id);
  }

  @Post('detect-missed')
  @Permissions('manage_shifts')
  detectMissed(@Request() req) {
    return this.shiftAssignmentsService.detectMissedShifts(req.user.agencyId);
  }

  @Get('report')
  @Permissions('view_shifts')
  getReport(@Request() req, @Query('date') date?: string) {
    return this.shiftAssignmentsService.getShiftReport(
      req.user.agencyId,
      date,
    );
  }

  @Delete(':id')
  @Permissions('manage_shifts')
  remove(@Request() req, @Param('id') id: string) {
    return this.shiftAssignmentsService.remove(req.user.agencyId, id);
  }
}
