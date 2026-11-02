import type { Badge } from '@prisma/client';
import type { BadgeDto } from '../dto/badge.dto';

export function toBadgeDto(b: Badge): BadgeDto {
  return {
    id: b.id,
    name: { en: b.nameEn, ar: b.nameAr },
    description: { en: b.descriptionEn, ar: b.descriptionAr },
    howTo: { en: b.howToEn, ar: b.howToAr },
    group: { en: b.groupEn, ar: b.groupAr },
    icon: b.icon,
    tier: b.tier as 'bronze' | 'silver' | 'gold',
    manual: b.criteria === null,
  };
}
