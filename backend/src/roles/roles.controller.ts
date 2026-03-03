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
  Query,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

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
  @Permissions('manage_roles')
  async getRoles(@Request() req, @Query('agencyId') agencyId?: string) {
    const targetAgencyId = req.user.agencyId || agencyId;
    return this.rolesService.findAllRoles(targetAgencyId);
  }

  @Post()
  @Permissions('manage_roles')
  async createRole(@Request() req, @Body() data: any) {
    const targetAgencyId = req.user.agencyId || data.agencyId;
    return this.rolesService.createRole(targetAgencyId, data);
  }

  @Put(':id')
  @Permissions('manage_roles')
  async updateRole(@Request() req, @Param('id') id: string, @Body() data: any) {
    const targetAgencyId = req.user.agencyId || data.agencyId;
    return this.rolesService.updateRole(targetAgencyId, id, data);
  }

  @Delete(':id')
  @Permissions('manage_roles')
  async removeRole(@Request() req, @Param('id') id: string) {
    return this.rolesService.removeRole(req.user.agencyId, id);
  }
}
