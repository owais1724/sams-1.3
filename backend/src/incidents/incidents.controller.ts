import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';

@Controller('incidents')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @Permissions('view_incidents')
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('deploymentId') deploymentId?: string,
  ) {
    return this.incidentsService.findAll(req.user.agencyId, {
      status,
      severity: severity ? parseInt(severity, 10) : undefined,
      deploymentId,
    });
  }

  @Get('my-incidents')
  async myIncidents(@Request() req) {
    return this.incidentsService.findByReporter(req.user.agencyId, req.user.userId);
  }

  @Get(':id')
  @Permissions('view_incidents')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.incidentsService.findOne(req.user.agencyId, id);
  }

  @Post()
  @Permissions('report_incident')
  async create(@Request() req, @Body() dto: CreateIncidentDto) {
    return this.incidentsService.create(req.user.agencyId, req.user.userId, dto);
  }

  @Patch(':id/status')
  @Permissions('manage_incidents')
  async updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    return this.incidentsService.updateStatus(
      req.user.agencyId,
      id,
      dto.status,
      req.user.userId,
      dto.notes,
    );
  }
}
