import type { Role } from "@/data";

/**
 * Central RBAC predicates. Badges and the Skill Tree are earned via quest XP,
 * and only Employees run quests — so Manager/Admin never see either surface.
 */
export const canViewBadges = (role: Role) => role === "employee";
export const canViewSkillTree = (role: Role) => role === "employee";

/**
 * Rank, lifetime XP, kudos, quest counts and activity history belong to people who take part in the
 * programme. The Admin only runs it, so their profile shows identity details and nothing else.
 */
export const hasEngagementProfile = (role: Role) => role !== "admin";

/** Only Employees are eligible respondents — same scoping as the backend's survey endpoints. */
export const canTakeSurveys = (role: Role) => role === "employee";

/** Only Managers run a department — Admin isn't part of one, so no team to manage. */
export const canManageTeam = (role: Role) => role === "manager";
