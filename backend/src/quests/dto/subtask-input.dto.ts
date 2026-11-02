import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class SubtaskInputDto {
  // Present when editing an existing subtask — keeps employees' ticks attached to it.
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  titleEn!: string;

  @IsOptional()
  @IsString()
  titleAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;
}
