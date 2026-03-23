import { IsString, IsDateString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateDeploymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Client site is required' })
  clientId: string;

  @IsString()
  @IsNotEmpty({ message: 'Shift is required' })
  shiftId: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startDate: string;

  @IsDateString()
  @IsNotEmpty({ message: 'End date is required' })
  endDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guardIds?: string[];
}
