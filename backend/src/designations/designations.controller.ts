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
} from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('designations')
@UseGuards(AuthGuard('jwt'))
export class DesignationsController {
  private readonly logger = new Logger(DesignationsController.name);

  constructor(private readonly designationsService: DesignationsService) {}

  @Post()
  async create(@Request() req, @Body() data: any) {
    this.logger.log(`POST /designations - User: ${req.user?.userId}, Agency: ${req.user?.agencyId}`);
    this.logger.log(`Request body: ${JSON.stringify(data)}`);
    
    return this.designationsService.create(req.user.agencyId, data);
  }

  @Get()
  async findAll(@Request() req) {
    return this.designationsService.findAll(req.user.agencyId);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.designationsService.remove(req.user.agencyId, id);
  }
}
