import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

  @IsOptional()
  @IsInt()
  @Min(0)
  startingXp?: number;
}
