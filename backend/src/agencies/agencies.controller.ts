import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  Request,
  Patch,
} from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

@Controller('agencies')
@UseGuards(AuthGuard('jwt'))
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) { }

  @Post()
  async create(@Request() req, @Body() data: CreateAgencyDto) {
    if (req.user.role !== 'Super Admin') {
      throw new ForbiddenException('Only Super Admins can create agencies');
    }
    return this.agenciesService.createAgency(data);
  }

  @Get()
  async findAll(@Request() req) {
    if (req.user.role !== 'Super Admin') {
      throw new ForbiddenException('Only Super Admins can list agencies');
    }
    return this.agenciesService.findAll();
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateAgencyDto,
  ) {
    if (req.user.role !== 'Super Admin') {
      throw new ForbiddenException('Only Super Admins can update agencies');
    }
    return this.agenciesService.update(id, data);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    if (req.user.role !== 'Super Admin') {
      throw new ForbiddenException('Only Super Admins can delete agencies');
    }
    return this.agenciesService.remove(id);
  }
}
