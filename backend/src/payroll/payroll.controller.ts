import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PayrollService } from './payroll.service';
import { type CreatePayrollDto, type UpdatePayrollDto } from './payroll.entity';

@Controller('payrolls')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) { }

  @Post()
  @Permissions('manage_payroll')
  async createPayroll(@Body() createPayrollDto: CreatePayrollDto, @Request() req) {
    return this.payrollService.createPayroll(createPayrollDto, req.user.agencyId);
  }

  @Get()
  @Permissions('view_payroll', 'manage_payroll')
  async getPayrolls(@Request() req) {
    return this.payrollService.getPayrolls(req.user.agencyId);
  }

  @Get(':id')
  @Permissions('view_payroll', 'manage_payroll')
  async getPayrollById(@Param('id') id: string, @Request() req) {
    return this.payrollService.getPayrollById(id, req.user.agencyId);
  }

  @Put(':id')
  @Permissions('manage_payroll')
  async updatePayroll(@Param('id') id: string, @Body() updatePayrollDto: UpdatePayrollDto, @Request() req) {
    return this.payrollService.updatePayroll(id, updatePayrollDto, req.user.agencyId);
  }

  @Delete(':id')
  @Permissions('manage_payroll')
  async deletePayroll(@Param('id') id: string, @Request() req) {
    return this.payrollService.deletePayroll(id, req.user.agencyId);
  }

  @Post('generate-bulk')
  @Permissions('manage_payroll')
  async generateBulkPayroll(
    @Body('month') month: string,
    @Body('designationId') designationId: string,
    @Request() req,
  ) {
    return this.payrollService.generateBulkPayroll(month, req.user.agencyId, designationId);
  }

  @Post(':id/status')
  @Permissions('manage_payroll')
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req) {
    return this.payrollService.updateStatus(id, status, req.user.agencyId);
  }

  @Post('generate-individual')
  @Permissions('manage_payroll')
  async generateIndividual(
    @Body() data: { employeeId: string; month: string; amount: number },
    @Request() req,
  ) {
    return this.payrollService.generateIndividual(data, req.user.agencyId);
  }
}
