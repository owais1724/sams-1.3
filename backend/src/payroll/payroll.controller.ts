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
import { CreatePayrollDto, UpdatePayrollDto } from './payroll.entity';
import { requireAgencyContext } from '../common/utils/agency-context.util';

@Controller('payrolls')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) { }

  @Post()
  @Permissions('manage_payroll')
  async createPayroll(@Body() createPayrollDto: CreatePayrollDto, @Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.payrollService.createPayroll(createPayrollDto, agencyId);
  }

  @Get()
  @Permissions('view_payroll', 'manage_payroll')
  async getPayrolls(@Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.payrollService.getPayrolls(agencyId);
  }

  @Get(':id')
  @Permissions('view_payroll', 'manage_payroll')
  async getPayrollById(@Param('id') id: string, @Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.payrollService.getPayrollById(id, agencyId);
  }

  @Put(':id')
  @Permissions('manage_payroll')
  async updatePayroll(@Param('id') id: string, @Body() updatePayrollDto: UpdatePayrollDto, @Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.payrollService.updatePayroll(id, updatePayrollDto, agencyId);
  }

  @Delete(':id')
  @Permissions('manage_payroll')
  async deletePayroll(@Param('id') id: string, @Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.payrollService.deletePayroll(id, agencyId);
  }

  @Post('generate-bulk')
  @Permissions('manage_payroll')
  async generateBulkPayroll(
    @Body('month') month: string,
    @Body('designationId') designationId: string,
    @Request() req,
  ) {
    const agencyId = requireAgencyContext(req);
    return this.payrollService.generateBulkPayroll(month, agencyId, designationId);
  }

  @Post(':id/status')
  @Permissions('manage_payroll')
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req) {
    const agencyId = requireAgencyContext(req);
    return this.payrollService.updateStatus(id, status, agencyId);
  }

  @Post('generate-individual')
  @Permissions('manage_payroll')
  async generateIndividual(
    @Body() data: { employeeId: string; month: string; amount: number },
    @Request() req,
  ) {
    const agencyId = requireAgencyContext(req);
    return this.payrollService.generateIndividual(data, agencyId);
  }
}
