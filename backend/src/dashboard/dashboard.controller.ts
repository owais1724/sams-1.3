import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { DashboardService } from './dashboard.service';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('today-deployments')
  @Permissions('view_dashboard')
  async getTodayDeployments(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.dashboardService.getTodayDeployments(agencyId);
  }

  @Get('attendance-summary')
  @Permissions('view_dashboard')
  async getAttendanceSummary(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.dashboardService.getAttendanceSummary(agencyId);
  }

  @Get('open-incidents')
  @Permissions('view_dashboard')
  async getOpenIncidents(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.dashboardService.getOpenIncidents(agencyId);
  }

  @Get('guards-on-duty')
  @Permissions('view_dashboard')
  async getGuardsOnDuty(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.dashboardService.getGuardsOnDuty(agencyId);
  }

  @Get('recent-activity')
  @Permissions('view_dashboard')
  async getRecentActivity(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.dashboardService.getRecentActivity(agencyId);
  }
}
