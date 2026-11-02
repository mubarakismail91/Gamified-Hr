/**
 * Mirrors `StaffMember` in the frontend's src/data/types.ts field-for-field
 * (minus passwordHash, obviously). Every bilingual field is composed here
 * into { en, ar } so the frontend's existing components — which all expect
 * that shape — need zero changes to consume this.
 */
export interface Bi {
  en: string;
  ar: string;
}

export interface StaffMemberDto {
  id: string;
  name: Bi;
  initials: string;
  title: Bi;
  departmentId: string | null;
  department: Bi;
  college: Bi;
  role: 'employee' | 'manager' | 'admin';
  gender: 'male' | 'female';
  staffId: string;
  email: string;
  office: Bi;
  joined: Date;
  totalXp: number;
  pointsThisWeek: number;
  pointsThisMonth: number;
  xpGainedThisMonth: number;
  streakDays: number;
  badgeIds: string[];
  /** Badges the Employee chose to show on the leaderboard, in display order. Empty = they haven't chosen. */
  featuredBadgeIds: string[];
  avatarTone: string;
  mustChangePassword: boolean;
}
