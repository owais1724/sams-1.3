import { IsOptional, IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreatePayrollDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsNotEmpty()
  @IsString()
  month: string;

  @IsNotEmpty()
  @IsNumber()
  basicSalary: number;

  @IsNotEmpty()
  @IsNumber()
  allowances: number;

  @IsNotEmpty()
  @IsNumber()
  deductions: number;

  @IsNotEmpty()
  @IsNumber()
  netPay: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdatePayrollDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  basicSalary?: number;

  @IsOptional()
  @IsNumber()
  allowances?: number;

  @IsOptional()
  @IsNumber()
  deductions?: number;

  @IsOptional()
  @IsNumber()
  netPay?: number;
}

export interface Payroll {
  id: string;
  employeeId?: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: string;
  generatedDate: Date;
  updatedAt: Date;
  employee?: {
    id: string;
    fullName: string;
    email: string;
    designation: {
      name: string;
    };
  };
}
