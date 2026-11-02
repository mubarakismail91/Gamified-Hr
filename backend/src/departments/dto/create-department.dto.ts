import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(1)
  nameEn!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  managerId?: string | null;
}
