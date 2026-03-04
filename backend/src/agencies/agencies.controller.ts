import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('agencies')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) { }

  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.agenciesService.findBySlug(slug);
  }

  @Post()
  @Permissions('create_agency')
  async create(@Request() req, @Body() data: CreateAgencyDto) {
    return this.agenciesService.createAgency(data);
  }

  @Get()
  @Permissions('create_agency', 'edit_agency', 'delete_agency')
  async findAll(@Request() req) {
    return this.agenciesService.findAll();
  }

  @Patch(':id')
  @Permissions('edit_agency')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateAgencyDto,
  ) {
    return this.agenciesService.update(id, data);
  }

  @Delete(':id')
  @Permissions('delete_agency')
  async remove(@Request() req, @Param('id') id: string) {
    return this.agenciesService.remove(id);
  }

  @Patch(':id/toggle-status')
  @Permissions('edit_agency')
  async toggleStatus(@Request() req, @Param('id') id: string) {
    return this.agenciesService.toggleStatus(id);
  }
}
