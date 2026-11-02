import { ArrayMaxSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export const MAX_FEATURED_BADGES = 4;

export class SetFeaturedBadgesDto {
  /** Badge ids in display order. Every id must be one the Employee has actually earned. */
  @IsArray()
  @ArrayMaxSize(MAX_FEATURED_BADGES)
  @ArrayUnique()
  @IsString({ each: true })
  badgeIds!: string[];
}
