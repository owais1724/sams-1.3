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
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('projects')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @Post()
  @Permissions('create_project')
  async create(@Request() req, @Body() data: any) {
    return this.projectsService.create(req.user.agencyId, data);
  }

  @Get()
  @Permissions('view_projects')
  async findAll(@Request() req) {
    return this.projectsService.findAll(req.user.agencyId);
  }

  @Patch(':id')
  @Permissions('edit_project')
  async update(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.projectsService.update(req.user.agencyId, id, data);
  }

  @Delete(':id')
  @Permissions('delete_project')
  async remove(@Request() req, @Param('id') id: string) {
    return this.projectsService.remove(req.user.agencyId, id);
  }
}
