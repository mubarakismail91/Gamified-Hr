import type { Badge, Department, Quest, QuestSubmission, StaffMember, UserQuest } from "@/data/types";
import type { DemoState } from "./seed";

export type Period = "week" | "month";
export type Scope = "dept" | "uni";
export type Metric = "points" | "progress";

/** Simple, stable string hash — used only to give locked badges a believable,
 *  non-random progress % for staff who don't have an authored override. */
function hashPct(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return 10 + (h % 8) * 10; // 10..80
}

export const staffById = (state: DemoState, id: string) => state.users.find((u) => u.id === id);
export const departmentById = (state: DemoState, id: string | null) =>
  id ? state.departments.find((d) => d.id === id) : undefined;
export const badgeById = (state: DemoState, id: string) => state.badges.find((b) => b.id === id);
export const questById = (state: DemoState, id: string) => state.quests.find((q) => q.id === id);

export function colleagues(state: DemoState, viewerId: string) {
  return state.users.filter((s) => s.id !== viewerId);
}

export function departmentTeam(state: DemoState, departmentId: string, opts?: { excludeManager?: boolean }) {
  const dept = departmentById(state, departmentId);
  return state.users.filter(
    (u) => u.departmentId === departmentId && !(opts?.excludeManager && u.id === dept?.managerId),
  );
}

export function managedDepartment(state: DemoState, managerId: string): Department | undefined {
  return state.departments.find((d) => d.managerId === managerId);
}

// ---------------------------------------------------------------------------
// Quests — a Quest is the catalog entry; UserQuest is one person's progress.
// ---------------------------------------------------------------------------

export function userQuestFor(state: DemoState, questId: string, userId: string): UserQuest | undefined {
  return state.userQuests.find((uq) => uq.questId === questId && uq.userId === userId);
}

export interface QuestView {
  quest: Quest;
  progress: UserQuest;
}

/** Quests an employee can see: published, and either university-wide, their
 *  department's, or individually assigned to them. */
export function visibleQuestsFor(state: DemoState, user: StaffMember): QuestView[] {
  return state.quests
    .filter((q) => q.status === "published")
    .filter((q) => q.departmentId === null || q.departmentId === user.departmentId)
    .filter((q) => !q.assigneeId || q.assigneeId === user.id)
    .map((quest) => ({
      quest,
      progress:
        userQuestFor(state, quest.id, user.id) ??
        ({ userId: user.id, questId: quest.id, state: "available", stepsDone: 0 } as UserQuest),
    }));
}

/** Quests a Manager/Admin can create/edit/delete for a given department (or
 *  university-wide when `departmentId` is null, Admin only). */
export function manageableQuests(state: DemoState, departmentId: string | null) {
  return state.quests.filter((q) => q.departmentId === departmentId);
}

export function activeQuestCount(state: DemoState, userId: string) {
  return state.userQuests.filter(
    (uq) => uq.userId === userId && (uq.state === "accepted" || uq.state === "pending_approval"),
  ).length;
}

export function completedQuestCount(state: DemoState, userId: string) {
  return state.userQuests.filter((uq) => uq.userId === userId && uq.state === "completed").length;
}

/** The submission attached to a quest attempt — the pending one if there is one, else the latest overall. */
export function submissionFor(state: DemoState, questId: string, userId: string): QuestSubmission | undefined {
  const matches = state.questSubmissions.filter((s) => s.questId === questId && s.userId === userId);
  return (
    matches.find((s) => s.status === "pending") ??
    matches.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0]
  );
}

export interface PendingApproval {
  quest: Quest;
  progress: UserQuest;
  user: StaffMember;
  submission?: QuestSubmission;
}

/** Submitted quests awaiting a decision. `departmentId` = null means every department (Admin view). */
export function pendingApprovals(state: DemoState, departmentId: string | null): PendingApproval[] {
  return state.userQuests
    .filter((uq) => uq.state === "pending_approval")
    .map((progress) => ({
      progress,
      quest: questById(state, progress.questId)!,
      user: staffById(state, progress.userId)!,
      submission: submissionFor(state, progress.questId, progress.userId),
    }))
    .filter((row) => row.quest && row.user)
    .filter((row) => departmentId === null || row.user.departmentId === departmentId)
    .sort((a, b) => (b.progress.submittedAt?.getTime() ?? 0) - (a.progress.submittedAt?.getTime() ?? 0));
}

export interface SubmissionHistoryRow {
  submission: QuestSubmission;
  quest: Quest;
  user: StaffMember;
}

/** Resolved (approved/denied) submissions for a department, most recent decision first. */
export function submissionHistory(state: DemoState, departmentId: string): SubmissionHistoryRow[] {
  return state.questSubmissions
    .filter((s) => s.status !== "pending" && s.departmentId === departmentId)
    .map((submission) => ({
      submission,
      quest: questById(state, submission.questId)!,
      user: staffById(state, submission.userId)!,
    }))
    .filter((row) => row.quest && row.user)
    .sort((a, b) => (b.submission.reviewedAt?.getTime() ?? 0) - (a.submission.reviewedAt?.getTime() ?? 0));
}

// ---------------------------------------------------------------------------
// Badges — catalog + per-user earned/progress derived from StaffMember.
// ---------------------------------------------------------------------------

export interface BadgeView extends Badge {
  earned: boolean;
  earnedOn?: Date;
  progressPct?: number;
}

export function userBadges(state: DemoState, user: StaffMember) {
  const earnedIds = new Set(user.badgeIds);
  const all: BadgeView[] = state.badges.map((b) => {
    if (earnedIds.has(b.id)) {
      return { ...b, earned: true, earnedOn: user.badgeEarnedOn?.[b.id] ?? user.joined };
    }
    return { ...b, earned: false, progressPct: user.badgeProgress?.[b.id] ?? hashPct(b.id) };
  });
  const earned = all.filter((b) => b.earned);
  return { all, earned, earnedCount: earned.length, total: all.length };
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/** Flavour-only rank deltas vs. the previous period — not authoritative history. */
const DELTA: Record<string, number> = {
  "u-ahmed": 2,
  "u-fatimah": 1,
  "u-khalid": -1,
  "u-noura": 4,
  "u-yusuf": -2,
  "u-maryam": 0,
  "u-ibrahim": -1,
  "u-sara": 1,
  "u-abdullah": 0,
  "u-huda": 5,
  "u-omar": -3,
  "u-aisha": 1,
  "u-mansour": -2,
  "u-lina": 3,
};

interface RankedRow {
  staffId: string;
  points: number;
  progress: number;
  deltaRank: number;
  staff: StaffMember;
  position: number;
}

export function rankedLeaderboard(
  state: DemoState,
  opts: {
    period: Period;
    scope: Scope;
    metric: Metric;
    viewerId: string;
    /** Admin's department picker: undefined = use `scope`/viewer's own department (Employee/Manager); null = every department (university-wide); a department id = just that one. */
    departmentId?: string | null;
  },
): RankedRow[] {
  const viewer = staffById(state, opts.viewerId);

  // Only Employees earn XP (via quests), so only Employees are ever ranked —
  // Managers/Admins keep their XP fields (still shown on their own Profile),
  // they're simply excluded from every leaderboard query.
  let rows = state.users
    .filter((s) => s.role === "employee")
    .map((s) => ({
      staffId: s.id,
      points: opts.period === "week" ? s.pointsThisWeek : s.pointsThisMonth,
      progress: opts.period === "week" ? Math.round(s.pointsThisWeek * 1.6) : s.xpGainedThisMonth,
      deltaRank: DELTA[s.id] ?? 0,
      staff: s,
    }));

  if (opts.departmentId !== undefined) {
    if (opts.departmentId !== null) {
      rows = rows.filter((r) => r.staff.departmentId === opts.departmentId);
    }
  } else if (opts.scope === "dept" && viewer) {
    rows = rows.filter((r) => r.staff.departmentId === viewer.departmentId);
  }

  rows.sort((a, b) => (opts.metric === "points" ? b.points - a.points : b.progress - a.progress));

  return rows.map((r, i) => ({ ...r, position: i + 1 }));
}

/** The top-ranked Employee in a department (by points for the period), or undefined if the team is empty. */
export function departmentTopPerformer(state: DemoState, departmentId: string, period: Period = "week") {
  const rows = state.users
    .filter((s) => s.role === "employee" && s.departmentId === departmentId)
    .map((s) => ({ staff: s, points: period === "week" ? s.pointsThisWeek : s.pointsThisMonth }))
    .sort((a, b) => b.points - a.points);
  return rows[0];
}

/** Departments ranked by average Employee points for the period (Admin summary card). */
export function topDepartmentsByAvgXp(state: DemoState, period: Period = "week", limit = 3) {
  const rows = state.departments
    .map((dept) => {
      const employees = state.users.filter((s) => s.role === "employee" && s.departmentId === dept.id);
      const total = employees.reduce((sum, s) => sum + (period === "week" ? s.pointsThisWeek : s.pointsThisMonth), 0);
      const avg = employees.length ? Math.round(total / employees.length) : 0;
      return { department: dept, avgPoints: avg, employeeCount: employees.length };
    })
    .filter((r) => r.employeeCount > 0)
    .sort((a, b) => b.avgPoints - a.avgPoints);
  return rows.slice(0, limit);
}

/** The Employee with the most XP gained in the period — university-wide, or scoped to one department (Admin summary card). */
export function mostImprovedEmployee(state: DemoState, period: Period = "week", departmentId?: string | null) {
  const rows = state.users
    .filter((s) => s.role === "employee" && (departmentId == null || s.departmentId === departmentId))
    .map((s) => ({
      staff: s,
      progress: period === "week" ? Math.round(s.pointsThisWeek * 1.6) : s.xpGainedThisMonth,
    }))
    .sort((a, b) => b.progress - a.progress);
  return rows[0];
}

export function departmentRank(state: DemoState, viewerId: string, period: Period = "week") {
  const rows = rankedLeaderboard(state, { period, scope: "dept", metric: "points", viewerId });
  const me = rows.find((r) => r.staffId === viewerId);
  return { position: me?.position ?? rows.length, total: rows.length };
}

// ---------------------------------------------------------------------------
// Kudos, notifications, activity — per-user views
// ---------------------------------------------------------------------------

export function kudosReceived(state: DemoState, userId: string) {
  return state.kudos.filter((k) => k.toId === userId).sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function kudosGiven(state: DemoState, userId: string) {
  return state.kudos.filter((k) => k.fromId === userId).sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function notificationsFor(state: DemoState, userId: string) {
  return state.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function unreadCountFor(state: DemoState, userId: string) {
  return state.notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function activityFor(state: DemoState, userId: string) {
  return state.activity.filter((a) => a.userId === userId).sort((a, b) => b.at.getTime() - a.at.getTime());
}
