import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  Delete,
  Param,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { MigrationService } from './migration.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('employees')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly migrationService: MigrationService,
  ) { }

  @Get()
  @Permissions('view_employee', 'edit_project', 'create_project')
  findAll(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.employeesService.findAll(agencyId);
  }

  @Post()
  @Permissions('create_employee')
  create(
    @Request() req,
    @Body() data: CreateEmployeeDto,
  ) {
    const agencyId = requireAgencyContext(req);
    return this.employeesService.create(agencyId, data);
  }

  @Patch(':id')
  @Permissions('edit_employee')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateEmployeeDto,
  ) {
    const agencyId = requireAgencyContext(req);
    return this.employeesService.update(agencyId, id, data);
  }

  @Patch(':id/promote')
  @Permissions('manage_roles')
  promote(
    @Request() req,
    @Param('id') id: string,
    @Body() data?: { roleId?: string },
  ) {
    const agencyId = requireAgencyContext(req);
    return this.employeesService.promoteToAgencyAdmin(agencyId, id, data?.roleId);
  }

  @Patch(':id/demote')
  @Permissions('manage_roles')
  demote(
    @Request() req,
    @Param('id') id: string,
    @Body() data?: { roleId?: string },
  ) {
    const agencyId = requireAgencyContext(req);
    return this.employeesService.demoteToStaffRole(agencyId, id, data?.roleId);
  }

  @Patch(':id/suspend')
  @Permissions('manage_roles')
  suspend(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.employeesService.toggleEmployeeUserSuspension(agencyId, id);
  }

  @Delete(':id')
  @Permissions('manage_roles')
  remove(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.employeesService.remove(agencyId, id, req.user?.userId || req.user?.sub);
  }

  @Post('sync-roles')
  @Permissions('manage_roles')
  syncRoles(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.migrationService.syncEmployeeRolesToDesignations(agencyId);
  }
}
