import { IsString, IsOptional, ValidateIf } from 'class-validator';

export class CheckOutDto {
  @ValidateIf((o) => !o.deploymentId)
  @IsString({ message: 'projectId must be a string' })
  projectId?: string;

  @ValidateIf((o) => !o.projectId)
  @IsString({ message: 'deploymentId must be a string' })
  deploymentId?: string;
}
