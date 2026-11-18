import type { Generation, StaffType } from '@prisma/client';
import type { Bi } from './dto/staff-member.dto';

/**
 * Optional demographic fields (item 3 of the GP2 remaining-work plan).
 *
 * - Only coarse groups are stored, never a birth year (data minimisation).
 * - On a User, null = not recorded yet and `undisclosed` = the person chose not to say.
 * - These fields are shown only to Admins, never on profiles, leaderboards or team views.
 * - Any figure for a group is shown only when the group has at least MIN_GROUP_SIZE people.
 */
export const MIN_GROUP_SIZE = 5;

export type DemographicDimension = 'generation' | 'staffType';
export const DEMOGRAPHIC_DIMENSIONS: DemographicDimension[] = ['generation', 'staffType'];

export const GENERATION_VALUES = ['gen_z', 'millennial', 'gen_x', 'boomer', 'undisclosed'] as const;
export const STAFF_TYPE_VALUES = ['academic', 'administrative', 'undisclosed'] as const;

export interface GroupDef {
  key: string;
  label: Bi;
}

export const GENERATION_GROUPS: GroupDef[] = [
  { key: 'gen_z', label: { en: 'Gen Z (1997–2012)', ar: 'الجيل زد (1997–2012)' } },
  { key: 'millennial', label: { en: 'Millennials (1981–1996)', ar: 'جيل الألفية (1981–1996)' } },
  { key: 'gen_x', label: { en: 'Gen X (1965–1980)', ar: 'الجيل إكس (1965–1980)' } },
  { key: 'boomer', label: { en: 'Baby Boomers (1946–1964)', ar: 'جيل طفرة المواليد (1946–1964)' } },
];

export const STAFF_TYPE_GROUPS: GroupDef[] = [
  { key: 'academic', label: { en: 'Academic', ar: 'أكاديمي' } },
  { key: 'administrative', label: { en: 'Administrative', ar: 'إداري' } },
];

export const GROUPS_BY_DIMENSION: Record<DemographicDimension, GroupDef[]> = {
  generation: GENERATION_GROUPS,
  staffType: STAFF_TYPE_GROUPS,
};

/** "Prefer not to say" and "not recorded" merged — used wherever the difference doesn't matter (survey tags, engagement). */
export const NOT_STATED: GroupDef = { key: 'not_stated', label: { en: 'Not stated', ar: 'غير محدد' } };
export const PREFER_NOT_TO_SAY: GroupDef = { key: 'undisclosed', label: { en: 'Prefer not to say', ar: 'يفضّل عدم الإفصاح' } };
export const NOT_RECORDED: GroupDef = { key: 'not_recorded', label: { en: 'Not recorded', ar: 'غير مسجّل' } };

/** The tag copied onto an anonymous survey response: `undisclosed` and "not recorded" are both stored as null. */
export function toResponseTag<T extends Generation | StaffType>(value: T | null): Exclude<T, 'undisclosed'> | null {
  return value === null || value === 'undisclosed' ? null : (value as Exclude<T, 'undisclosed'>);
}
