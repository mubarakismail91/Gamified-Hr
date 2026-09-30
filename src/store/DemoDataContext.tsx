import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Bi, Department, Kudo, Quest, QuestSubmission, Role, StaffMember } from "@/data/types";
import { buildSeed, UNIVERSITY_WIDE_BI, type DemoState } from "./seed";
import { clearAllFiles, putFile } from "./fileStore";

const STORAGE_KEY = "iu-hr-demo-data-v1";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** JSON.parse reviver — turns any ISO-8601 string back into a Date, generically. */
function reviveDates(_key: string, value: unknown) {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) return new Date(value);
  return value;
}

function loadInitial(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw, reviveDates) as Partial<DemoState>;
      // Persisted state may predate a field added in a later version (e.g.
      // questSubmissions) — backfill from a fresh seed rather than crash.
      return { ...buildSeed(), ...parsed, questSubmissions: parsed.questSubmissions ?? [] };
    }
  } catch {
    /* corrupt or unavailable storage — fall back to seed */
  }
  return buildSeed();
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter}`;
}

function initialsFrom(name: string) {
  const parts = name
    .replace(/^Dr\.\s*/, "")
    .trim()
    .split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

const AVATAR_TONES = ["bg-primary/10 text-primary", "bg-accent/15 text-accent-foreground"];

const SYSTEM: Bi = { en: "System", ar: "النظام" };
const ADMIN_LABEL: Bi = { en: "Admin", ar: "مشرف" };

function makeAudit(actor: Bi, action: Bi, target: Bi) {
  return { id: nextId("au"), at: new Date(), actor, action, target };
}

/** Keeps `role` consistent with who is actually assigned as a department manager.
 *  Admins are never touched. */
function syncManagerRoles(state: DemoState): DemoState {
  const managerIds = new Set(state.departments.map((d) => d.managerId).filter(Boolean) as string[]);
  const users = state.users.map((u) => {
    if (u.role === "admin") return u;
    if (managerIds.has(u.id) && u.role !== "manager") return { ...u, role: "manager" as Role };
    if (!managerIds.has(u.id) && u.role === "manager") return { ...u, role: "employee" as Role };
    return u;
  });
  return { ...state, users };
}

export interface NewUserInput {
  nameEn: string;
  nameAr?: string;
  email: string;
  titleEn?: string;
  /** null = Admin (university-wide, no single department). */
  departmentId: string | null;
  role: Role;
  gender?: "male" | "female";
  startingXp?: number;
}

export interface NewDepartmentInput {
  nameEn: string;
  nameAr?: string;
  managerId: string | null;
}

export interface NewQuestInput {
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  categoryEn?: string;
  categoryAr?: string;
  cadence: Quest["cadence"];
  difficulty?: Quest["difficulty"];
  xp: number;
  steps?: number;
  departmentId: string | null;
  assigneeId?: string;
  status: Quest["status"];
  createdBy: string;
  requireFile?: boolean;
}

export interface NewKudoInput {
  fromId: string;
  toId: string;
  value: Kudo["value"];
  message: Bi;
}

interface DemoDataValue {
  state: DemoState;

  addUser(input: NewUserInput): string;
  updateUser(id: string, patch: Partial<StaffMember>): void;
  deleteUser(id: string): void;

  addDepartment(input: NewDepartmentInput): string;
  updateDepartment(id: string, patch: Partial<Pick<Department, "name" | "managerId">>): void;
  deleteDepartment(id: string): boolean;

  createQuest(input: NewQuestInput): string;
  updateQuest(id: string, patch: Partial<Quest>): void;
  deleteQuest(id: string): void;

  acceptQuest(questId: string, userId: string): void;
  advanceQuestStep(questId: string, userId: string): void;
  /** Submits a quest for review. `file` is optional — pass null to submit with notes only (or nothing at all). */
  submitQuestWork(questId: string, userId: string, file: File | null, notes: string): Promise<void>;
  approveQuest(questId: string, userId: string, approverId: string): void;
  rejectQuest(questId: string, userId: string, approverId: string, note?: string): void;

  awardXp(userId: string, amount: number, reason: string, actorId: string): void;
  awardBadge(userId: string, badgeId: string, actorId: string): void;
  sendKudos(input: NewKudoInput): void;

  markNotificationRead(id: string): void;
  markAllNotificationsRead(userId: string): void;

  resetToSeed(): void;
}

const Ctx = createContext<DemoDataValue | null>(null);

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — demo still works in-memory for this session */
    }
  }, [state]);

  const addUser = useCallback((input: NewUserInput) => {
    const id = nextId("u");
    setState((s) => {
      const dept = input.departmentId ? s.departments.find((d) => d.id === input.departmentId) : undefined;
      const user: StaffMember = {
        id,
        name: { en: input.nameEn, ar: input.nameAr || input.nameEn },
        initials: initialsFrom(input.nameEn),
        title: { en: input.titleEn || "", ar: input.titleEn || "" },
        departmentId: input.departmentId,
        department: dept ? dept.name : UNIVERSITY_WIDE_BI,
        college: { en: "", ar: "" },
        role: input.role,
        gender: input.gender ?? "male",
        staffId: `IU-${Math.floor(10000 + Math.random() * 89999)}`,
        email: input.email,
        office: { en: "", ar: "" },
        joined: new Date(),
        totalXp: input.startingXp ?? 0,
        pointsThisWeek: 0,
        pointsThisMonth: 0,
        xpGainedThisMonth: 0,
        streakDays: 0,
        badgeIds: [],
        avatarTone: AVATAR_TONES[s.users.length % AVATAR_TONES.length],
      };
      const audit = [
        makeAudit(ADMIN_LABEL, { en: "Created user account", ar: "أنشأ حساب مستخدم" }, user.name),
        ...s.audit,
      ];
      return syncManagerRoles({ ...s, users: [...s.users, user], audit });
    });
    return id;
  }, []);

  const updateUser = useCallback((id: string, patch: Partial<StaffMember>) => {
    setState((s) => {
      // `departmentId` may be explicitly patched to null (e.g. a user becoming Admin) —
      // distinguish "not touched" (key absent) from "cleared" (key present, value null).
      const departmentTouched = "departmentId" in patch;
      const dept = patch.departmentId ? s.departments.find((d) => d.id === patch.departmentId) : undefined;
      const users = s.users.map((u) =>
        u.id === id
          ? { ...u, ...patch, department: departmentTouched ? (dept ? dept.name : UNIVERSITY_WIDE_BI) : u.department }
          : u,
      );
      const target = users.find((u) => u.id === id);
      const audit = target
        ? [makeAudit(ADMIN_LABEL, { en: "Updated user account", ar: "حدّث حساب مستخدم" }, target.name), ...s.audit]
        : s.audit;
      return syncManagerRoles({ ...s, users, audit });
    });
  }, []);

  const deleteUser = useCallback((id: string) => {
    setState((s) => {
      const target = s.users.find((u) => u.id === id);
      if (!target) return s;
      const departments = s.departments.map((d) => (d.managerId === id ? { ...d, managerId: null } : d));
      const users = s.users.filter((u) => u.id !== id);
      const userQuests = s.userQuests.filter((uq) => uq.userId !== id);
      const questSubmissions = s.questSubmissions.filter((sub) => sub.userId !== id);
      const kudos = s.kudos.filter((k) => k.fromId !== id && k.toId !== id);
      const notifications = s.notifications.filter((n) => n.userId !== id);
      const activity = s.activity.filter((a) => a.userId !== id);
      const audit = [makeAudit(ADMIN_LABEL, { en: "Deleted user account", ar: "حذف حساب مستخدم" }, target.name), ...s.audit];
      return syncManagerRoles({
        ...s,
        users,
        departments,
        userQuests,
        questSubmissions,
        kudos,
        notifications,
        activity,
        audit,
      });
    });
  }, []);

  const addDepartment = useCallback((input: NewDepartmentInput) => {
    const id = nextId("dep");
    setState((s) => {
      const department: Department = {
        id,
        name: { en: input.nameEn, ar: input.nameAr || input.nameEn },
        managerId: input.managerId,
      };
      const audit = [
        makeAudit(ADMIN_LABEL, { en: "Created department", ar: "أنشأ قسمًا" }, department.name),
        ...s.audit,
      ];
      return syncManagerRoles({ ...s, departments: [...s.departments, department], audit });
    });
    return id;
  }, []);

  const updateDepartment = useCallback(
    (id: string, patch: Partial<Pick<Department, "name" | "managerId">>) => {
      setState((s) => {
        const departments = s.departments.map((d) => (d.id === id ? { ...d, ...patch } : d));
        const dept = departments.find((d) => d.id === id);
        let users = s.users;
        if (patch.name && dept) {
          users = users.map((u) => (u.departmentId === id ? { ...u, department: dept.name } : u));
        }
        const audit = dept
          ? [makeAudit(ADMIN_LABEL, { en: "Updated department", ar: "حدّث قسمًا" }, dept.name), ...s.audit]
          : s.audit;
        return syncManagerRoles({ ...s, departments, users, audit });
      });
    },
    [],
  );

  const deleteDepartment = useCallback((id: string) => {
    let succeeded = true;
    setState((s) => {
      const stillOccupied = s.users.some((u) => u.departmentId === id);
      if (stillOccupied) {
        succeeded = false;
        return s;
      }
      const dept = s.departments.find((d) => d.id === id);
      const departments = s.departments.filter((d) => d.id !== id);
      const quests = s.quests.filter((q) => q.departmentId !== id);
      const audit = dept
        ? [makeAudit(ADMIN_LABEL, { en: "Deleted department", ar: "حذف قسمًا" }, dept.name), ...s.audit]
        : s.audit;
      return syncManagerRoles({ ...s, departments, quests, audit });
    });
    return succeeded;
  }, []);

  const createQuest = useCallback((input: NewQuestInput) => {
    const id = nextId("q");
    setState((s) => {
      const quest: Quest = {
        id,
        title: { en: input.titleEn, ar: input.titleAr || input.titleEn },
        description: { en: input.descriptionEn ?? "", ar: input.descriptionAr || input.descriptionEn || "" },
        cadence: input.cadence,
        category: { en: input.categoryEn || "General", ar: input.categoryAr || input.categoryEn || "عام" },
        difficulty: input.difficulty ?? "medium",
        xp: input.xp,
        steps: input.steps ?? 1,
        departmentId: input.departmentId,
        assigneeId: input.assigneeId,
        status: input.status,
        createdBy: input.createdBy,
        requireFile: input.requireFile,
      };
      const creator = s.users.find((u) => u.id === input.createdBy);
      const audit = [
        makeAudit(
          creator ? creator.name : ADMIN_LABEL,
          input.status === "published"
            ? { en: "Published quest", ar: "نشر مهمة" }
            : { en: "Saved quest draft", ar: "حفظ مسودة مهمة" },
          quest.title,
        ),
        ...s.audit,
      ];
      return { ...s, quests: [quest, ...s.quests], audit };
    });
    return id;
  }, []);

  const updateQuest = useCallback((id: string, patch: Partial<Quest>) => {
    setState((s) => {
      const quests = s.quests.map((q) => (q.id === id ? { ...q, ...patch } : q));
      const quest = quests.find((q) => q.id === id);
      const audit = quest
        ? [makeAudit(ADMIN_LABEL, { en: "Updated quest", ar: "حدّث مهمة" }, quest.title), ...s.audit]
        : s.audit;
      return { ...s, quests, audit };
    });
  }, []);

  const deleteQuest = useCallback((id: string) => {
    setState((s) => {
      const quest = s.quests.find((q) => q.id === id);
      if (!quest) return s;
      const quests = s.quests.filter((q) => q.id !== id);
      const userQuests = s.userQuests.filter((uq) => uq.questId !== id);
      const questSubmissions = s.questSubmissions.filter((sub) => sub.questId !== id);
      const audit = [makeAudit(ADMIN_LABEL, { en: "Deleted quest", ar: "حذف مهمة" }, quest.title), ...s.audit];
      return { ...s, quests, userQuests, questSubmissions, audit };
    });
  }, []);

  const acceptQuest = useCallback((questId: string, userId: string) => {
    setState((s) => {
      const quest = s.quests.find((q) => q.id === questId);
      if (!quest) return s;
      const exists = s.userQuests.some((uq) => uq.questId === questId && uq.userId === userId);
      const userQuests = exists
        ? s.userQuests.map((uq) =>
            uq.questId === questId && uq.userId === userId
              ? { ...uq, state: "accepted" as const, acceptedAt: new Date() }
              : uq,
          )
        : [...s.userQuests, { userId, questId, state: "accepted" as const, stepsDone: 0, acceptedAt: new Date() }];
      return { ...s, userQuests };
    });
  }, []);

  const advanceQuestStep = useCallback((questId: string, userId: string) => {
    setState((s) => {
      const quest = s.quests.find((q) => q.id === questId);
      if (!quest) return s;
      const userQuests = s.userQuests.map((uq) =>
        uq.questId === questId && uq.userId === userId
          ? { ...uq, stepsDone: Math.min(quest.steps, uq.stepsDone + 1) }
          : uq,
      );
      return { ...s, userQuests };
    });
  }, []);

  const submitQuestWork = useCallback(async (questId: string, userId: string, file: File | null, notes: string) => {
    // File is optional — only touch IndexedDB when one was actually provided.
    let fileKey: string | undefined;
    if (file) {
      fileKey = nextId("file");
      await putFile(fileKey, file);
    }

    setState((s) => {
      const quest = s.quests.find((q) => q.id === questId);
      const user = s.users.find((u) => u.id === userId);
      if (!quest || !user) return s;
      const userQuests = s.userQuests.map((uq) =>
        uq.questId === questId && uq.userId === userId
          ? { ...uq, state: "pending_approval" as const, submittedAt: new Date(), rejectionNote: undefined }
          : uq,
      );
      const submission: QuestSubmission = {
        id: nextId("sub"),
        questId,
        userId,
        departmentId: user.departmentId,
        ...(file && fileKey
          ? { fileName: file.name, fileType: file.type, fileSize: file.size, fileKey }
          : {}),
        notes: notes || undefined,
        status: "pending",
        submittedAt: new Date(),
      };
      const dept = s.departments.find((d) => d.id === user.departmentId);
      let notifications = s.notifications;
      if (dept?.managerId) {
        notifications = [
          {
            id: nextId("n"),
            userId: dept.managerId,
            kind: "quest",
            title: { en: "Quest submitted for review", ar: "مهمة بانتظار مراجعتك" },
            body: {
              en: `${user.name.en} submitted “${quest.title.en}” for approval.`,
              ar: `قدّم ${user.name.ar} مهمة «${quest.title.ar}» للمراجعة.`,
            },
            at: new Date(),
            read: false,
          },
          ...notifications,
        ];
      }
      const activity = [
        {
          id: nextId("a"),
          userId,
          kind: "quest" as const,
          text: {
            en: `Submitted “${quest.title.en}” for manager approval`,
            ar: `أرسلت مهمة «${quest.title.ar}» لموافقة المدير`,
          },
          at: new Date(),
        },
        ...s.activity,
      ];
      const audit = [
        makeAudit(user.name, { en: "Submitted quest for approval", ar: "أرسل مهمة للموافقة" }, quest.title),
        ...s.audit,
      ];
      return {
        ...s,
        userQuests,
        questSubmissions: [submission, ...s.questSubmissions],
        notifications,
        activity,
        audit,
      };
    });
  }, []);

  const approveQuest = useCallback((questId: string, userId: string, approverId: string) => {
    setState((s) => {
      const quest = s.quests.find((q) => q.id === questId);
      const user = s.users.find((u) => u.id === userId);
      const approver = s.users.find((u) => u.id === approverId);
      if (!quest || !user) return s;
      const userQuests = s.userQuests.map((uq) =>
        uq.questId === questId && uq.userId === userId
          ? { ...uq, state: "completed" as const, approvedAt: new Date(), approvedBy: approverId }
          : uq,
      );
      const questSubmissions = s.questSubmissions.map((sub) =>
        sub.questId === questId && sub.userId === userId && sub.status === "pending"
          ? { ...sub, status: "approved" as const, reviewedAt: new Date(), reviewedBy: approverId }
          : sub,
      );
      const users = s.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              totalXp: u.totalXp + quest.xp,
              pointsThisWeek: u.pointsThisWeek + quest.xp,
              pointsThisMonth: u.pointsThisMonth + quest.xp,
              xpGainedThisMonth: u.xpGainedThisMonth + quest.xp,
            }
          : u,
      );
      const notifications = [
        {
          id: nextId("n"),
          userId,
          kind: "xp" as const,
          title: { en: `+${quest.xp} XP earned`, ar: `‏+${quest.xp} نقطة` },
          body: {
            en: `“${quest.title.en}” was approved by your manager.`,
            ar: `تمت الموافقة على «${quest.title.ar}» من قِبل مديرك.`,
          },
          at: new Date(),
          read: false,
        },
        ...s.notifications,
      ];
      const activity = [
        {
          id: nextId("a"),
          userId,
          kind: "xp" as const,
          text: { en: `Quest approved: ${quest.title.en}`, ar: `تمت الموافقة على المهمة: ${quest.title.ar}` },
          xp: quest.xp,
          at: new Date(),
        },
        ...s.activity,
      ];
      const audit = [
        makeAudit(
          approver ? approver.name : SYSTEM,
          { en: `Approved quest completion (+${quest.xp} XP)`, ar: `الموافقة على إكمال المهمة (‏+${quest.xp} نقطة)` },
          user.name,
        ),
        ...s.audit,
      ];
      return { ...s, userQuests, questSubmissions, users, notifications, activity, audit };
    });
  }, []);

  const rejectQuest = useCallback((questId: string, userId: string, approverId: string, note?: string) => {
    setState((s) => {
      const quest = s.quests.find((q) => q.id === questId);
      const user = s.users.find((u) => u.id === userId);
      const approver = s.users.find((u) => u.id === approverId);
      if (!quest || !user) return s;
      const userQuests = s.userQuests.map((uq) =>
        uq.questId === questId && uq.userId === userId
          ? { ...uq, state: "accepted" as const, rejectionNote: note, submittedAt: undefined }
          : uq,
      );
      const questSubmissions = s.questSubmissions.map((sub) =>
        sub.questId === questId && sub.userId === userId && sub.status === "pending"
          ? { ...sub, status: "denied" as const, reviewedAt: new Date(), reviewedBy: approverId, feedback: note }
          : sub,
      );
      const notifications = [
        {
          id: nextId("n"),
          userId,
          kind: "quest" as const,
          title: { en: "Submission returned", ar: "أُعيدت المهمة" },
          body: note
            ? { en: `“${quest.title.en}” needs another look: ${note}`, ar: `مهمة «${quest.title.ar}» تحتاج مراجعة: ${note}` }
            : {
                en: `“${quest.title.en}” was returned for more work.`,
                ar: `أُعيدت مهمة «${quest.title.ar}» لمزيد من العمل.`,
              },
          at: new Date(),
          read: false,
        },
        ...s.notifications,
      ];
      const audit = [
        makeAudit(approver ? approver.name : SYSTEM, { en: "Rejected quest submission", ar: "رفض تقديم المهمة" }, user.name),
        ...s.audit,
      ];
      return { ...s, userQuests, questSubmissions, notifications, audit };
    });
  }, []);

  const awardXp = useCallback((userId: string, amount: number, reason: string, actorId: string) => {
    setState((s) => {
      const user = s.users.find((u) => u.id === userId);
      const actor = s.users.find((u) => u.id === actorId);
      if (!user) return s;
      const users = s.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              totalXp: Math.max(0, u.totalXp + amount),
              pointsThisWeek: Math.max(0, u.pointsThisWeek + amount),
              pointsThisMonth: Math.max(0, u.pointsThisMonth + amount),
              xpGainedThisMonth: Math.max(0, u.xpGainedThisMonth + amount),
            }
          : u,
      );
      const sign = amount >= 0 ? "+" : "";
      const notifications = [
        {
          id: nextId("n"),
          userId,
          kind: "xp" as const,
          title: { en: `${sign}${amount} XP`, ar: `${sign}${amount} نقطة` },
          body: reason
            ? { en: reason, ar: reason }
            : { en: "Awarded by an administrator.", ar: "مُنحت من قبل المشرف." },
          at: new Date(),
          read: false,
        },
        ...s.notifications,
      ];
      const activity = [
        {
          id: nextId("a"),
          userId,
          kind: "xp" as const,
          text: reason ? { en: reason, ar: reason } : { en: "XP adjustment", ar: "تعديل نقاط" },
          xp: amount,
          at: new Date(),
        },
        ...s.activity,
      ];
      const audit = [
        makeAudit(
          actor ? actor.name : ADMIN_LABEL,
          {
            en: `Awarded ${sign}${amount} XP${reason ? ` (${reason})` : ""}`,
            ar: `منح ${sign}${amount} نقطة${reason ? ` (${reason})` : ""}`,
          },
          user.name,
        ),
        ...s.audit,
      ];
      return { ...s, users, notifications, activity, audit };
    });
  }, []);

  const awardBadge = useCallback((userId: string, badgeId: string, actorId: string) => {
    setState((s) => {
      const user = s.users.find((u) => u.id === userId);
      const badge = s.badges.find((b) => b.id === badgeId);
      const actor = s.users.find((u) => u.id === actorId);
      if (!user || !badge || user.badgeIds.includes(badgeId)) return s;
      const users = s.users.map((u) =>
        u.id === userId
          ? { ...u, badgeIds: [...u.badgeIds, badgeId], badgeEarnedOn: { ...u.badgeEarnedOn, [badgeId]: new Date() } }
          : u,
      );
      const notifications = [
        {
          id: nextId("n"),
          userId,
          kind: "badge" as const,
          title: { en: `New badge unlocked: ${badge.name.en}`, ar: `وسام جديد: ${badge.name.ar}` },
          body: badge.description,
          at: new Date(),
          read: false,
        },
        ...s.notifications,
      ];
      const activity = [
        {
          id: nextId("a"),
          userId,
          kind: "badge" as const,
          text: { en: `Earned badge: ${badge.name.en}`, ar: `حصل على وسام: ${badge.name.ar}` },
          at: new Date(),
        },
        ...s.activity,
      ];
      const audit = [
        makeAudit(actor ? actor.name : ADMIN_LABEL, { en: `Granted badge "${badge.name.en}"`, ar: `منح وسام «${badge.name.ar}»` }, user.name),
        ...s.audit,
      ];
      return { ...s, users, notifications, activity, audit };
    });
  }, []);

  const sendKudos = useCallback((input: NewKudoInput) => {
    setState((s) => {
      const from = s.users.find((u) => u.id === input.fromId);
      const to = s.users.find((u) => u.id === input.toId);
      if (!from || !to) return s;
      const kudo: Kudo = { id: nextId("k"), fromId: input.fromId, toId: input.toId, value: input.value, message: input.message, at: new Date() };
      const bonus = 15;
      const users = s.users.map((u) =>
        u.id === input.toId
          ? {
              ...u,
              totalXp: u.totalXp + bonus,
              pointsThisWeek: u.pointsThisWeek + bonus,
              pointsThisMonth: u.pointsThisMonth + bonus,
              xpGainedThisMonth: u.xpGainedThisMonth + bonus,
            }
          : u,
      );
      const notifications = [
        {
          id: nextId("n"),
          userId: input.toId,
          kind: "social" as const,
          title: { en: `New Kudos from ${from.name.en}`, ar: `شكر جديد من ${from.name.ar}` },
          body: input.message,
          at: new Date(),
          read: false,
        },
        ...s.notifications,
      ];
      const activity = [
        {
          id: nextId("a"),
          userId: input.toId,
          kind: "kudo" as const,
          text: { en: `Received Kudos from ${from.name.en}`, ar: `استلم شكرًا من ${from.name.ar}` },
          xp: bonus,
          at: new Date(),
        },
        ...s.activity,
      ];
      const audit = [makeAudit(from.name, { en: "Sent Kudos", ar: "أرسل شكرًا" }, to.name), ...s.audit];
      return { ...s, kudos: [kudo, ...s.kudos], users, notifications, activity, audit };
    });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }, []);

  const markAllNotificationsRead = useCallback((userId: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
    }));
  }, []);

  const resetToSeed = useCallback(() => {
    setState(buildSeed());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    // Best-effort: also drop any uploaded submission files from IndexedDB.
    void clearAllFiles().catch(() => {
      /* ignore — nothing user-visible depends on this succeeding */
    });
  }, []);

  const value = useMemo<DemoDataValue>(
    () => ({
      state,
      addUser,
      updateUser,
      deleteUser,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      createQuest,
      updateQuest,
      deleteQuest,
      acceptQuest,
      advanceQuestStep,
      submitQuestWork,
      approveQuest,
      rejectQuest,
      awardXp,
      awardBadge,
      sendKudos,
      markNotificationRead,
      markAllNotificationsRead,
      resetToSeed,
    }),
    [
      state,
      addUser,
      updateUser,
      deleteUser,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      createQuest,
      updateQuest,
      deleteQuest,
      acceptQuest,
      advanceQuestStep,
      submitQuestWork,
      approveQuest,
      rejectQuest,
      awardXp,
      awardBadge,
      sendKudos,
      markNotificationRead,
      markAllNotificationsRead,
      resetToSeed,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemoData must be used within DemoDataProvider");
  return ctx;
}
