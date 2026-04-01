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
import { ShiftsService } from './shifts.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('shifts')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @Permissions('view_shifts')
  findAll(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.shiftsService.findAll(agencyId);
  }

  @Get(':id')
  @Permissions('view_shifts')
  findOne(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.shiftsService.findOne(agencyId, id);
  }

  @Post()
  @Permissions('manage_shifts')
  create(@Request() req, @Body() data: { name: string; startTime: string; endTime: string }) {
    const agencyId = requireAgencyContext(req);
    return this.shiftsService.create(agencyId, data);
  }

  @Patch(':id')
  @Permissions('manage_shifts')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: { name?: string; startTime?: string; endTime?: string; isActive?: boolean },
  ) {
    const agencyId = requireAgencyContext(req);
    return this.shiftsService.update(agencyId, id, data);
  }

  @Delete(':id')
  @Permissions('manage_shifts')
  remove(@Request() req, @Param('id') id: string) {
    const agencyId = requireAgencyContext(req);
    return this.shiftsService.remove(agencyId, id);
  }
}
