import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateIncidentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  deploymentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  severity?: number;
}
