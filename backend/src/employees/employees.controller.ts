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
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { MigrationService } from './migration.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
@UseGuards(AuthGuard('jwt'))
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly migrationService: MigrationService,
  ) { }

  @Get()
  findAll(@Request() req, @Query('agencyId') agencyId?: string) {
    const targetAgencyId = req.user.agencyId || agencyId;
    return this.employeesService.findAll(targetAgencyId);
  }

  @Post()
  create(@Request() req, @Body() data: CreateEmployeeDto & { agencyId?: string }) {
    const targetAgencyId = req.user.agencyId || data.agencyId;
    if (!targetAgencyId) {
      throw new Error('Agency context is required to create an employee');
    }
    return this.employeesService.create(targetAgencyId, data);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(req.user.agencyId, id, data);
  }

  @Post('sync-roles')
  syncRoles(@Request() req, @Body() data: { agencyId?: string }) {
    const targetAgencyId = req.user.agencyId || data.agencyId;
    if (!targetAgencyId) {
      throw new Error('Agency context is required to sync roles');
    }
    return this.migrationService.syncEmployeeRolesToDesignations(
      targetAgencyId,
    );
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.employeesService.remove(req.user.agencyId, id, req.user.sub);
  }
}
