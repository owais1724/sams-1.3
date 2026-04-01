import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('agencies')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) { }

  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.agenciesService.findBySlug(slug);
  }

  @Post()
  @RequirePermissions('manage_agencies')
  async create(@Body() data: CreateAgencyDto) {
    return this.agenciesService.createAgency(data);
  }

  @Get()
  @RequirePermissions('manage_agencies')
  async findAll() {
    return this.agenciesService.findAll();
  }

  @Patch(':id')
  @RequirePermissions('manage_agencies')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateAgencyDto,
  ) {
    return this.agenciesService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('manage_agencies')
  async remove(@Param('id') id: string) {
    return this.agenciesService.remove(id);
  }

  @Patch(':id/toggle-status')
  @RequirePermissions('manage_agencies')
  async toggleStatus(@Param('id') id: string) {
    return this.agenciesService.toggleStatus(id);
  }

  @Get(':agencyId/admins')
  @RequirePermissions('manage_agencies')
  async listAgencyAdmins(@Param('agencyId') agencyId: string) {
    return this.agenciesService.listAgencyAdmins(agencyId);
  }

  @Get(':agencyId/staff-roles')
  @RequirePermissions('manage_agencies')
  async listAgencyStaffRoles(@Param('agencyId') agencyId: string) {
    return this.agenciesService.listAgencyStaffRoles(agencyId);
  }

  @Post(':agencyId/admins')
  @RequirePermissions('manage_agencies')
  async createAgencyAdmin(
    @Param('agencyId') agencyId: string,
    @Body() data: { name: string; email: string; password: string },
  ) {
    return this.agenciesService.createAgencyAdmin(agencyId, data);
  }

  @Patch(':agencyId/admins/:userId/demote')
  @RequirePermissions('manage_agencies')
  async demoteAgencyAdmin(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
    @Body() data?: { roleId?: string },
  ) {
    return this.agenciesService.demoteAgencyAdmin(agencyId, userId, data?.roleId);
  }

  @Patch(':agencyId/admins/:userId/promote')
  @RequirePermissions('manage_agencies')
  async promoteAgencyAdmin(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
  ) {
    return this.agenciesService.promoteAgencyAdmin(agencyId, userId);
  }

  @Delete(':agencyId/admins/:userId')
  @RequirePermissions('manage_agencies')
  async deleteAgencyAdmin(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
  ) {
    return this.agenciesService.deleteAgencyAdmin(agencyId, userId);
  }

  @Patch(':agencyId/admins/:userId/suspend')
  @RequirePermissions('manage_agencies')
  async suspendAgencyAdmin(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
  ) {
    return this.agenciesService.toggleAgencyAdminSuspension(agencyId, userId);
  }
}
