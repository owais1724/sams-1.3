import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { LeavesService } from './leaves.service';
import { LeaveStatus, LeaveType } from './leave.entity';
import { CreateLeaveRequestDto } from './dto/create-leave.dto';
import { LeaveApprovalDto } from './dto/approve-leave.dto';

@Controller('leaves')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) { }

  @Post()
  @Permissions('apply_leave')
  async createLeaveRequest(
    @Body() createLeaveDto: CreateLeaveRequestDto,
    @Request() req,
  ) {
    return this.leavesService.createLeaveRequest(createLeaveDto, req.user.agencyId);
  }

  @Get()
  @Permissions('view_leaves', 'approve_leave', 'apply_leave')
  async getLeaveRequests(@Request() req) {
    return this.leavesService.getLeaveRequests(req.user.agencyId, req.user.role, req.user.userId);
  }

  @Put(':id/approve')
  @Permissions('approve_leave')
  async approveLeave(
    @Param('id') leaveId: string,
    @Body() approvalDto: LeaveApprovalDto,
    @Request() req,
  ) {
    return this.leavesService.approveLeave(leaveId, approvalDto, req.user.role, req.user.userId, req.user.agencyId);
  }

  // These enum routes don't need permission checks as they are read-only metadata
  // We use AuthGuard('jwt') only (any logged-in user can see leave types/statuses)
  @Get('types')
  async getLeaveTypes() {
    return Object.values(LeaveType);
  }

  @Get('statuses')
  async getLeaveStatuses() {
    return Object.values(LeaveStatus);
  }
}
