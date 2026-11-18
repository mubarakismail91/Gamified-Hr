import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { GENERATION_VALUES, STAFF_TYPE_VALUES } from '../../common/demographics';

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

  /** Optional. null = not recorded; 'undisclosed' = prefers not to say. Never a birth year. */
  @IsOptional()
  @IsIn(GENERATION_VALUES)
  generation?: (typeof GENERATION_VALUES)[number] | null;

  /** Optional. Academic or administrative staff; same null/'undisclosed' convention. */
  @IsOptional()
  @IsIn(STAFF_TYPE_VALUES)
  staffType?: (typeof STAFF_TYPE_VALUES)[number] | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
