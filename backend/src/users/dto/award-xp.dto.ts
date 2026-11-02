import { IsInt, IsOptional, IsString } from 'class-validator';

export class AwardXpDto {
  @IsInt()
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
