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
  Query,
} from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('designations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DesignationsController {
  private readonly logger = new Logger(DesignationsController.name);

  constructor(private readonly designationsService: DesignationsService) { }

  @Post()
  @Permissions('manage_roles', 'create_employee')
  async create(@Request() req, @Body() data: any) {
    this.logger.log(`POST /designations - User: ${req.user?.userId}, Agency: ${req.user?.agencyId}`);
    const agencyId = req.user.agencyId || data.agencyId;
    if (!agencyId) {
      throw new Error('Agency context is required to create a designation');
    }
    return this.designationsService.create(agencyId, data);
  }

  @Get()
  @Permissions('manage_roles', 'create_employee', 'edit_employee', 'view_employee', 'manage_payroll', 'view_payroll')
  async findAll(@Request() req, @Query('agencyId') agencyId?: string) {
    const targetAgencyId = req.user.agencyId || agencyId;
    return this.designationsService.findAll(targetAgencyId);
  }

  @Delete(':id')
  @Permissions('manage_roles')
  async remove(@Request() req, @Param('id') id: string) {
    return this.designationsService.remove(req.user.agencyId, id);
  }
}
