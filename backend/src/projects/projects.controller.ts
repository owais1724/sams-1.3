import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('projects')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @Post()
  @Permissions('create_project')
  async create(@Request() req, @Body() data: any) {
    const agencyId = requireAgencyContext(req);
    return this.projectsService.create(agencyId, data);
  }

  @Get()
  @Permissions('view_projects')
  async findAll(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.projectsService.findAll(agencyId);
  }

  // Special endpoint for attendance - allows all authenticated users to see projects for attendance marking
  @Get('for-attendance')
  async findForAttendance(@Request() req) {
    // No specific permission required - all authenticated users can see projects for attendance
    const agencyId = requireAgencyContext(req);
    return this.projectsService.findAll(agencyId);
  }

  @Patch(':id')
  @Permissions('edit_project')
  async update(@Request() req, @Param('id') id: string, @Body() data: any) {
    const agencyId = requireAgencyContext(req);
    return this.projectsService.update(agencyId, id, data);
  }

  @Delete(':id')
  @Permissions('delete_project')
  async remove(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.projectsService.remove(agencyId, id);
  }
}
