import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  nameEn?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsIn(['employee', 'manager', 'admin'])
  role?: 'employee' | 'manager' | 'admin';

  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: 'male' | 'female';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
