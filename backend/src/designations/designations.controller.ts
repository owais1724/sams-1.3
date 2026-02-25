import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
  Query,
} from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('designations')
@UseGuards(AuthGuard('jwt'))
export class DesignationsController {
  private readonly logger = new Logger(DesignationsController.name);

  constructor(private readonly designationsService: DesignationsService) { }

  @Post()
  async create(@Request() req, @Body() data: any) {
    this.logger.log(`POST /designations - User: ${req.user?.userId}, Agency: ${req.user?.agencyId}`);
    this.logger.log(`Request body: ${JSON.stringify(data)}`);

    // For Super Admins, allow passing agencyId in the body if they don't have one in their token
    const agencyId = req.user.agencyId || data.agencyId;

    if (!agencyId) {
      this.logger.error('No agencyId found in token or request body');
      throw new Error('Agency context is required to create a designation');
    }

    return this.designationsService.create(agencyId, data);
  }

  @Get()
  async findAll(@Request() req, @Query('agencyId') agencyId?: string) {
    const targetAgencyId = req.user.agencyId || agencyId;
    return this.designationsService.findAll(targetAgencyId);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.designationsService.remove(req.user.agencyId, id);
  }
}
