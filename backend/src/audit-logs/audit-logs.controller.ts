import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions('view_reports')
  async findAll(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.auditLogsService.findAll(agencyId);
  }
}
