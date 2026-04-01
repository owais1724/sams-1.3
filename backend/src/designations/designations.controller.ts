import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('designations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DesignationsController {
  private readonly logger = new Logger(DesignationsController.name);

  constructor(private readonly designationsService: DesignationsService) { }

  @Post()
  @Permissions('manage_roles', 'create_employee')
  async create(@Request() req, @Body() data: any) {
    const agencyId = requireAgencyContext(req);
    this.logger.log(`POST /designations - User: ${req.user?.userId}, Agency: ${agencyId}`);
    return this.designationsService.create(agencyId, data);
  }

  @Get()
  @Permissions('manage_roles', 'create_employee', 'edit_employee', 'view_employee', 'manage_payroll', 'view_payroll')
  async findAll(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.designationsService.findAll(agencyId);
  }

  @Delete(':id')
  @Permissions('manage_roles')
  async remove(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.designationsService.remove(agencyId, id);
  }
}
