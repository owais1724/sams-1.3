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

@Controller('clients')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @Post()
  @Permissions('create_client')
  async create(@Request() req, @Body() data: any) {
    return this.clientsService.create(req.user.agencyId, data);
  }

  @Get()
  @Permissions('view_clients')
  async findAll(@Request() req) {
    return this.clientsService.findAll(req.user.agencyId);
  }

  @Patch(':id')
  @Permissions('edit_client')
  async update(@Param('id') id: string, @Request() req, @Body() data: any) {
    return this.clientsService.update(id, req.user.agencyId, data);
  }

  @Delete(':id')
  @Permissions('delete_client')
  async remove(@Param('id') id: string, @Request() req) {
    return this.clientsService.remove(id, req.user.agencyId);
  }
}
