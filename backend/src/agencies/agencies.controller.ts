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
}
