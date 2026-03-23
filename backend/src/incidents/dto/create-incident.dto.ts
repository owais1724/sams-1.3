import { IsString, IsOptional, IsInt, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  @IsNotEmpty({ message: 'Deployment site is required' })
  deploymentId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  severity?: number;
}
