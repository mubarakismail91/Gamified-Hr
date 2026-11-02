export type Role = "employee" | "manager" | "admin";

export type Lang = "en" | "ar";

/** A bilingual string. Every user-facing label in mock data carries both. */
export interface Bi {
  en: string;
  ar: string;
}

export interface Department {
  id: string;
  name: Bi;
  /** Staff id of the department's manager, or null if unassigned. */
  managerId: string | null;
}

export interface StaffMember {
  id: string;
  name: Bi;
  initials: string;
  title: Bi;
  /** FK into Department — drives quest visibility, team rosters, dept leaderboard. null = Admin (university-wide, no single department). */
  departmentId: string | null;
  /** Denormalised display label — kept in sync with the Department's name. */
  department: Bi;
  college: Bi;
  role: Role;
  gender: "male" | "female";
  staffId: string;
  email: string;
  office: Bi;
  joined: Date;
  totalXp: number;
  pointsThisWeek: number;
  pointsThisMonth: number;
  xpGainedThisMonth: number;
  streakDays: number;
  /** Ids of earned badges. */
  badgeIds: string[];
  /** Real backend only — badges the Employee chose to show on the leaderboard, in display order. Empty = not chosen yet. */
  featuredBadgeIds?: string[];
  /** Optional per-badge earned date override (falls back to `joined`). */
  badgeEarnedOn?: Record<string, Date>;
  /** Optional per-badge progress override for un-earned badges (0-100). */
  badgeProgress?: Record<string, number>;
  avatarTone: string;
  /** Real backend only (absent for demo-seeded users) — prompts a forced password change on next login. */
  mustChangePassword?: boolean;
}

export type QuestCadence = "daily" | "epic";
export type QuestDifficulty = "easy" | "medium" | "hard";
export type QuestState = "available" | "accepted" | "pending_approval" | "completed";

/** The quest catalogue entry — created/edited by a Manager (own dept) or Admin (any dept, or university-wide). */
export interface Quest {
  id: string;
  title: Bi;
  description: Bi;
  cadence: QuestCadence;
  category: Bi;
  difficulty: QuestDifficulty;
  xp: number;
  steps: number;
  due?: Date;
  /** True once the deadline has passed; hidden from employees until a manager reactivates it. */
  expired?: boolean;
  /** Skill path this quest advances when completed; null/absent = general quest. */
  skillBranch?: SkillNode["branch"] | null;
  /** null = university-wide (Admin only); otherwise scopes the quest to one department. */
  departmentId: string | null;
  /** Optional: assign to one specific person instead of the whole department. */
  assigneeId?: string;
  status: "published" | "draft";
  createdBy: string;
  /** Soft recommendation only — the Employee can still submit without a file either way. */
  requireFile?: boolean;
  /** Long-form "how to do this" guidance, beyond the short description. */
  instructions?: Bi;
  estimatedMinutes?: number;
  /** Checklist items; when present, `steps` equals their count (backend keeps them in sync). */
  subtasks?: QuestSubtask[];
  /** Explanatory files the creator attached (briefs, templates, guides). */
  attachments?: QuestAttachment[];
}

export interface QuestSubtask {
  id: string;
  title: Bi;
  description: Bi;
}

export interface QuestAttachment {
  id: string;
  fileName: string;
  fileType?: string;
  fileSize: number;
}

/** One person's progress against a Quest. Absence of a row = "available" / not started. */
export interface UserQuest {
  /** Real backend only — absent for the synthetic "available" placeholder row (no assignment exists yet). */
  id?: string;
  userId: string;
  questId: string;
  state: QuestState;
  stepsDone: number;
  /** Ids of the quest's subtasks this person has ticked off (real backend only). */
  completedSubtaskIds?: string[];
  acceptedAt?: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionNote?: string;
}

/**
 * A proof-of-work submission for one quest attempt. The file itself is stored
 * by the backend and downloaded through `GET /submissions/:id/file`.
 */
export interface QuestSubmission {
  id: string;
  questId: string;
  userId: string;
  departmentId: string | null;
  /** All file fields are optional — a submission may have no file attached at all. */
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileKey?: string;
  notes?: string;
  status: "pending" | "approved" | "denied";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  feedback?: string;
}

/** Badge catalogue — earned status and progress are per-user (see StaffMember.badgeIds). */
export interface Badge {
  id: string;
  name: Bi;
  description: Bi;
  howTo: Bi;
  group: Bi;
  icon: string;
  tier: "bronze" | "silver" | "gold";
  /** Real backend only — true = no automatic rule, an Administrator grants it. */
  manual?: boolean;
}

export type SkillState = "unlocked" | "in-progress" | "locked";

export interface SkillNode {
  id: string;
  name: Bi;
  branch: "teaching" | "research" | "leadership" | "digital";
  description: Bi;
  state: SkillState;
  level: number;
  maxLevel: number;
  requires?: string[];
  col: number;
  row: number;
}

/** One skill path (branch) from the signed-in employee's point of view. */
export interface SkillPath {
  branch: SkillNode["branch"];
  followed: boolean;
  /** Quests completed on this path — each is one level. */
  points: number;
  /** Levels available across the whole path. */
  total: number;
}

export interface Kudo {
  id: string;
  fromId: string;
  toId: string;
  value: "collaboration" | "excellence" | "initiative" | "mentorship" | "service" | "integrity";
  message: Bi;
  at: Date;
}

export type ActivityKind = "xp" | "badge" | "quest" | "kudo" | "level" | "skill";

export interface ActivityItem {
  id: string;
  userId: string;
  kind: ActivityKind;
  text: Bi;
  xp?: number;
  at: Date;
}

export type NotificationKind = "xp" | "badge" | "social" | "quest" | "system";

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: Bi;
  body: Bi;
  at: Date;
  read: boolean;
}

export interface LeaderboardRow {
  staffId: string;
  points: number;
  progress: number;
  deltaRank: number;
}

export interface SurveyRound {
  id: string;
  title: Bi;
  status: "open" | "closed" | "scheduled";
  responses: number;
  target: number;
  opens: Date;
}

export interface AuditEntry {
  id: string;
  at: Date;
  actor: Bi;
  action: Bi;
  target: Bi;
}
