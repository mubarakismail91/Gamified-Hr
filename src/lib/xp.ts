/**
 * XP / level model for the prototype.
 * Levels are named ranks (professional-development framing, not "gamer" levels).
 * The curve is a gentle quadratic so early progress feels quick and later
 * ranks take sustained engagement.
 */

export interface RankTier {
  level: number;
  nameEn: string;
  nameAr: string;
  /** cumulative XP required to reach this level */
  threshold: number;
}

export const RANKS: RankTier[] = [
  { level: 1, nameEn: "Newcomer", nameAr: "مستجد", threshold: 0 },
  { level: 2, nameEn: "Contributor", nameAr: "مساهم", threshold: 300 },
  { level: 3, nameEn: "Practitioner", nameAr: "ممارس", threshold: 800 },
  { level: 4, nameEn: "Achiever", nameAr: "منجز", threshold: 1600 },
  { level: 5, nameEn: "Specialist", nameAr: "متخصص", threshold: 2800 },
  { level: 6, nameEn: "Mentor", nameAr: "موجّه", threshold: 4400 },
  { level: 7, nameEn: "Distinguished", nameAr: "متميّز", threshold: 6500 },
  { level: 8, nameEn: "Fellow", nameAr: "زميل أقدم", threshold: 9200 },
];

export interface LevelProgress {
  current: RankTier;
  next: RankTier | null;
  intoLevel: number;
  levelSpan: number;
  pct: number;
  xpToNext: number;
}

export function levelFromXp(totalXp: number): LevelProgress {
  let current = RANKS[0];
  for (const r of RANKS) if (totalXp >= r.threshold) current = r;

  const next = RANKS.find((r) => r.level === current.level + 1) ?? null;
  const levelSpan = next ? next.threshold - current.threshold : 1;
  const intoLevel = totalXp - current.threshold;
  const pct = next ? Math.round((intoLevel / levelSpan) * 100) : 100;
  const xpToNext = next ? next.threshold - totalXp : 0;

  return { current, next, intoLevel, levelSpan, pct, xpToNext };
}
