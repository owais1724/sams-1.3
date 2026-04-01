import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
  Delete,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('clients')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @Post()
  @Permissions('create_client')
  async create(@Request() req, @Body() data: any) {
    const agencyId = requireAgencyContext(req);
    return this.clientsService.create(agencyId, data);
  }

  @Get()
  @Permissions('view_clients', 'edit_project', 'create_project')
  async findAll(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.clientsService.findAll(agencyId);
  }

  @Patch(':id')
  @Permissions('edit_client')
  async update(@Param('id') id: string, @Request() req, @Body() data: any) {
    const agencyId = requireAgencyContext(req);
    return this.clientsService.update(id, agencyId, data);
  }

  @Delete(':id')
  @Permissions('delete_client')
  async remove(@Param('id') id: string, @Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.clientsService.remove(id, agencyId);
  }
}
