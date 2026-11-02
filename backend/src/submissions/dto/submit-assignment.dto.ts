import { IsOptional, IsString } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  assignmentId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
