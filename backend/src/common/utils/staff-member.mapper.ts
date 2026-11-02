import type { User, Department } from '@prisma/client';
import type { StaffMemberDto } from '../dto/staff-member.dto';
import type { PeriodXpStats } from './xp-period.util';

/** Matches the frontend's UNIVERSITY_WIDE_BI constant in src/store/seed.ts. */
const UNIVERSITY_WIDE_BI = { en: 'University-wide', ar: 'على مستوى الجامعة' };

export function toStaffMemberDto(
  user: User,
  department: Pick<Department, 'nameEn' | 'nameAr'> | null,
  periodStats: PeriodXpStats,
  badgeIds: string[],
): StaffMemberDto {
  return {
    id: user.id,
    name: { en: user.nameEn, ar: user.nameAr },
    initials: user.initials,
    title: { en: user.titleEn, ar: user.titleAr },
    departmentId: user.departmentId,
    department: department ? { en: department.nameEn, ar: department.nameAr } : UNIVERSITY_WIDE_BI,
    college: { en: user.collegeEn, ar: user.collegeAr },
    role: user.role,
    gender: user.gender,
    staffId: user.staffId,
    email: user.email,
    office: { en: user.officeEn, ar: user.officeAr },
    joined: user.createdAt,
    totalXp: user.totalXp,
    pointsThisWeek: periodStats.pointsThisWeek,
    pointsThisMonth: periodStats.pointsThisMonth,
    xpGainedThisMonth: periodStats.xpGainedThisMonth,
    streakDays: user.currentStreakDays,
    badgeIds,
    featuredBadgeIds: user.featuredBadgeIds,
    avatarTone: user.avatarTone,
    mustChangePassword: user.mustChangePassword,
  };
}
