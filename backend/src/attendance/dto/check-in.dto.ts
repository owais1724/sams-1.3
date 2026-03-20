import { IsString, IsOptional, IsIn, ValidateIf } from 'class-validator';

export class CheckInDto {
  @ValidateIf((o) => !o.deploymentId)
  @IsString({ message: 'projectId must be a string' })
  projectId?: string;

  @ValidateIf((o) => !o.projectId)
  @IsString({ message: 'deploymentId must be a string' })
  deploymentId?: string;

  @IsOptional()
  @IsIn(['WEB', 'QR', 'MOBILE'], { message: 'method must be one of: WEB, QR, MOBILE' })
  method?: string;

  @IsOptional()
  @IsString({ message: 'photo must be a string' })
  photo?: string;

  @IsOptional()
  @IsString({ message: 'latitude must be a string' })
  latitude?: string;

  @IsOptional()
  @IsString({ message: 'longitude must be a string' })
  longitude?: string;
}
