import {
    IsEmail,
    IsString,
    IsOptional,
    IsNumber,
    MinLength,
    Matches,
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
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    password?: string;
}
