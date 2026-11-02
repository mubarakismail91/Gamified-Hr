import { IsString } from 'class-validator';

export class AwardBadgeDto {
  @IsString()
  userId!: string;

  @IsString()
  badgeId!: string;
}
