import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Get('permissions')
  @Permissions('manage_roles')
  async getPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Get()
  @Permissions('manage_roles', 'promote_employee', 'demote_employee')
  async getRoles(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.rolesService.findAllRoles(agencyId);
  }

  @Post()
  @Permissions('manage_roles')
  async createRole(@Request() req, @Body() data: any) {
    const agencyId = requireAgencyContext(req);
    return this.rolesService.createRole(agencyId, data);
  }

  @Put(':id')
  @Permissions('manage_roles')
  async updateRole(@Request() req, @Param('id') id: string, @Body() data: any) {
    const agencyId = requireAgencyContext(req);
    return this.rolesService.updateRole(agencyId, id, data);
  }

  @Delete(':id')
  @Permissions('manage_roles')
  async removeRole(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.rolesService.removeRole(agencyId, id);
  }
}
