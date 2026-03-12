import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateIncidentStatusDto {
  @IsIn(['open', 'under_review', 'resolved', 'closed'])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
