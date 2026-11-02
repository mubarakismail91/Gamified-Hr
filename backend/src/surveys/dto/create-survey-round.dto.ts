import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSurveyRoundDto {
  @IsString()
  @MinLength(1)
  titleEn!: string;

  @IsOptional()
  @IsString()
  titleAr?: string;

  @IsString()
  @MinLength(1)
  quarter!: string;

  @IsDateString()
  opensAt!: string;

  @IsOptional()
  @IsDateString()
  closesAt?: string;
}
