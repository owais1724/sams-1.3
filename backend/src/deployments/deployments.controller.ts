import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { DeploymentsService } from './deployments.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { UpdateDeploymentDto } from './dto/update-deployment.dto';
import { AssignGuardsDto } from './dto/assign-guards.dto';

@Controller('deployments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Get()
  @Permissions('view_deployments')
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.deploymentsService.findAll(req.user.agencyId, { status, clientId });
  }

  @Get('my-schedule')
  async mySchedule(@Request() req) {
    return this.deploymentsService.findByGuard(req.user.agencyId, req.user.userId);
  }

  @Get(':id')
  @Permissions('view_deployments')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.deploymentsService.findOne(req.user.agencyId, id);
  }

  @Post()
  @Permissions('manage_deployments')
  async create(@Request() req, @Body() dto: CreateDeploymentDto) {
    return this.deploymentsService.create(req.user.agencyId, dto, req.user.userId);
  }

  @Patch(':id')
  @Permissions('manage_deployments')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateDeploymentDto,
  ) {
    return this.deploymentsService.update(req.user.agencyId, id, dto, req.user.userId);
  }

  @Patch(':id/status')
  @Permissions('manage_deployments')
  async updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: string,
  ) {
    return this.deploymentsService.updateStatus(req.user.agencyId, id, status, req.user.userId);
  }

  @Post(':id/guards')
  @Permissions('manage_deployments')
  async assignGuards(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: AssignGuardsDto,
  ) {
    return this.deploymentsService.assignGuards(req.user.agencyId, id, dto.guardIds);
  }

  @Delete(':id/guards/:guardId')
  @Permissions('manage_deployments')
  async removeGuard(
    @Param('id') id: string,
    @Param('guardId') guardId: string,
    @Request() req,
  ) {
    return this.deploymentsService.removeGuard(req.user.agencyId, id, guardId);
  }

  @Delete(':id')
  @Permissions('manage_deployments')
  async remove(@Param('id') id: string, @Request() req) {
    return this.deploymentsService.remove(req.user.agencyId, id, req.user.userId);
  }
}
