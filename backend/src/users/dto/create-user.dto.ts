import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { GENERATION_VALUES, STAFF_TYPE_VALUES } from '../../common/demographics';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  nameEn!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  /** null = university-wide (Admin only) — same rule as the frontend's "Admin has no department" decision. */
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsIn(['employee', 'manager', 'admin'])
  role!: 'employee' | 'manager' | 'admin';

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
  @IsInt()
  @Min(0)
  startingXp?: number;
}
