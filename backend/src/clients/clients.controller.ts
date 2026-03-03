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

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @Post()
  async create(@Request() req, @Body() data: any) {
    return this.clientsService.create(req.user.agencyId, data);
  }

  @Get()
  async findAll(@Request() req) {
    return this.clientsService.findAll(req.user.agencyId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Request() req, @Body() data: any) {
    return this.clientsService.update(id, req.user.agencyId, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.clientsService.remove(id, req.user.agencyId);
  }
}
