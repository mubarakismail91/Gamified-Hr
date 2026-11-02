import type { Bi } from '../../common/dto/staff-member.dto';
import type { BadgeDto } from '../../common/dto/badge.dto';
import type { SkillDto } from '../../common/dto/skill.dto';

export interface ProfileKudoDto {
  id: string;
  value: 'collaboration' | 'excellence' | 'initiative' | 'mentorship' | 'service' | 'integrity';
  message: Bi;
  at: Date;
  from: { id: string; name: Bi; initials: string; avatarTone: string };
}

/**
 * What anyone signed in can see about a colleague. Deliberately a narrow subset of the staff record:
 * no activity history, no notifications, and contact details only for the Admin (or the person themselves).
 */
export interface PublicProfileDto {
  id: string;
  isSelf: boolean;
  name: Bi;
  initials: string;
  title: Bi;
  department: Bi;
  college: Bi;
  role: 'employee' | 'manager' | 'admin';
  avatarTone: string;
  joined: Date;
  /** false for Admins — they run the programme and have no rank, XP or recognition to show. */
  hasEngagement: boolean;
  totalXp: number;
  kudosReceived: number;
  /** Employees only; null for Managers and Admins, who don't run quests. */
  questsCompleted: number | null;
  /** Earned badges only — what's still locked stays private. Employees only. */
  badges: (BadgeDto & { earnedOn: Date })[] | null;
  totalBadges: number;
  /** The person's own skill progress. Employees only. */
  skills: SkillDto[] | null;
  recentKudos: ProfileKudoDto[];
  contact: { email: string; staffId: string; office: Bi } | null;
}
