import {
    IsString,
    IsOptional,
    IsBoolean,
    MinLength,
    Matches,
    IsEmail,
} from 'class-validator';

export class UpdateAgencyDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    @Matches(/^[a-z0-9-]+$/)
    slug?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    @MinLength(2)
    adminName?: string;

    @IsOptional()
    @IsEmail()
    adminEmail?: string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    adminPassword?: string;
}
