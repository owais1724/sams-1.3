import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('agency')
  @Permissions('view_dashboard')
  async getAgencyDashboard(@Request() req) {
    return this.dashboardService.getAgencyDashboard(req.user.agencyId);
  }

  @Get('today-deployments')
  @Permissions('view_dashboard')
  async getTodayDeployments(@Request() req) {
    return this.dashboardService.getTodayDeployments(req.user.agencyId);
  }

  @Get('attendance-summary')
  @Permissions('view_dashboard')
  async getAttendanceSummary(@Request() req) {
    return this.dashboardService.getAttendanceSummary(req.user.agencyId);
  }

  @Get('open-incidents')
  @Permissions('view_dashboard')
  async getOpenIncidents(@Request() req) {
    return this.dashboardService.getOpenIncidents(req.user.agencyId);
  }

  @Get('guards-on-duty')
  @Permissions('view_dashboard')
  async getGuardsOnDuty(@Request() req) {
    return this.dashboardService.getGuardsOnDuty(req.user.agencyId);
  }

  @Get('recent-activity')
  @Permissions('view_dashboard')
  async getRecentActivity(@Request() req) {
    return this.dashboardService.getRecentActivity(req.user.agencyId);
  }
}
