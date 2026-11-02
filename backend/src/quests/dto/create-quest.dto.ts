import { Type } from 'class-transformer';
import { SubtaskInputDto } from './subtask-input.dto';
import { IsArray, ValidateNested, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateQuestDto {
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

  @IsOptional()
  @IsString()
  categoryEn?: string;

  @IsOptional()
  @IsString()
  categoryAr?: string;

  @IsIn(['daily', 'epic'])
  cadence!: 'daily' | 'epic';

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @IsInt()
  @Min(5)
  xp!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  steps?: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsBoolean()
  requireFile?: boolean;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  // Admin only — a Manager's quest is always scoped to their own department
  // (the service forces this, ignoring whatever's sent here).
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  // Which skill path completing this quest advances (null clears it).
  @IsOptional()
  @IsIn(['teaching', 'research', 'leadership', 'digital'])
  skillBranch?: 'teaching' | 'research' | 'leadership' | 'digital' | null;

  @IsOptional()
  @IsString()
  instructionsEn?: string;

  @IsOptional()
  @IsString()
  instructionsAr?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  // Replaces the quest's whole checklist: items with an `id` are updated, items without are created,
  // existing subtasks missing from the list are removed.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubtaskInputDto)
  subtasks?: SubtaskInputDto[];
}
