import { IsString, IsDateString, IsOptional, IsIn } from 'class-validator';

export class UpdateDeploymentDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['planned', 'active', 'completed', 'cancelled'])
  status?: string;
}
