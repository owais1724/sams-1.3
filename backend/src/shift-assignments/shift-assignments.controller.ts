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
import { requireAgencyContext } from '../common/utils/agency-context.util';

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
    const agencyId = requireAgencyContext(req);
    return this.shiftAssignmentsService.findAll(agencyId, {
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
    const agencyId = requireAgencyContext(req);
    return this.shiftAssignmentsService.create(agencyId, data);
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
    const agencyId = requireAgencyContext(req);
    return this.shiftAssignmentsService.bulkCreate(agencyId, data);
  }

  @Post(':id/check-in')
  @Permissions('view_shifts')
  checkIn(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.shiftAssignmentsService.checkIn(agencyId, id);
  }

  @Post(':id/check-out')
  @Permissions('view_shifts')
  checkOut(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.shiftAssignmentsService.checkOut(agencyId, id);
  }

  @Post('detect-missed')
  @Permissions('manage_shifts')
  detectMissed(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.shiftAssignmentsService.detectMissedShifts(agencyId);
  }

  @Get('report')
  @Permissions('view_shifts')
  getReport(@Request() req, @Query('date') date?: string) {
    const agencyId = requireAgencyContext(req);
    return this.shiftAssignmentsService.getShiftReport(
      agencyId,
      date,
    );
  }

  @Delete(':id')
  @Permissions('manage_shifts')
  remove(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.shiftAssignmentsService.remove(agencyId, id);
  }
}
