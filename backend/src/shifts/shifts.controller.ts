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

@Controller('shifts')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @Permissions('view_shifts')
  findAll(@Request() req) {
    return this.shiftsService.findAll(req.user.agencyId);
  }

  @Get(':id')
  @Permissions('view_shifts')
  findOne(@Request() req, @Param('id') id: string) {
    return this.shiftsService.findOne(req.user.agencyId, id);
  }

  @Post()
  @Permissions('manage_shifts')
  create(@Request() req, @Body() data: { name: string; startTime: string; endTime: string }) {
    return this.shiftsService.create(req.user.agencyId, data);
  }

  @Patch(':id')
  @Permissions('manage_shifts')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: { name?: string; startTime?: string; endTime?: string; isActive?: boolean },
  ) {
    return this.shiftsService.update(req.user.agencyId, id, data);
  }

  @Delete(':id')
  @Permissions('manage_shifts')
  remove(@Request() req, @Param('id') id: string) {
    return this.shiftsService.remove(req.user.agencyId, id);
  }
}
