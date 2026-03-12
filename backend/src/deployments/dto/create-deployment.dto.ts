import { IsString, IsDateString, IsOptional, IsArray } from 'class-validator';

export class CreateDeploymentDto {
  @IsString()
  clientId: string;

  @IsString()
  shiftId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guardIds?: string[];
}
