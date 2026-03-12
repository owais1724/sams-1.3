import { IsArray, IsString } from 'class-validator';

export class AssignGuardsDto {
  @IsArray()
  @IsString({ each: true })
  guardIds: string[];
}
