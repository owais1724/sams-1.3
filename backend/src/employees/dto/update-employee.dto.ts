import {
    IsEmail,
    IsString,
    IsOptional,
    IsNumber,
} from 'class-validator';

export class UpdateEmployeeDto {
    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    designationId?: string;

    @IsOptional()
    @IsNumber()
    basicSalary?: number;

    @IsOptional()
    @IsString()
    salaryCurrency?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    password?: string;
}
