import { ArrayMaxSize, IsArray, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSurveyRoundDto {
  @IsString()
  @MinLength(1)
  titleEn!: string;

  @IsOptional()
  @IsString()
  titleAr?: string;

  @IsDateString()
  opensAt!: string;

  @IsOptional()
  @IsDateString()
  closesAt?: string;

  /** Keys from the question bank; omitted = the default 6-item set. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  questionKeys?: string[];
}
