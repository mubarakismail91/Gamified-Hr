import type { Prisma, Quest, QuestAssignment, QuestSubmission } from '@prisma/client';
import type { QuestDto, AssignmentDto, SubmissionDto } from '../dto/quest.dto';

/** Pass as `include` on every quest query whose result goes through toQuestDto. */
export const questInclude = {
  subtasks: { orderBy: { position: 'asc' } },
  attachments: { orderBy: { uploadedAt: 'asc' } },
} satisfies Prisma.QuestInclude;

export type QuestWithRelations = Prisma.QuestGetPayload<{ include: typeof questInclude }>;

/** Pass as `include` on every assignment query whose result goes through toAssignmentDto. */
export const assignmentInclude = { subtaskProgress: { select: { subtaskId: true } } } satisfies Prisma.QuestAssignmentInclude;

export function toQuestDto(q: QuestWithRelations): QuestDto {
  return {
    id: q.id,
    title: { en: q.titleEn, ar: q.titleAr },
    description: { en: q.descriptionEn, ar: q.descriptionAr },
    cadence: q.cadence,
    category: { en: q.categoryEn, ar: q.categoryAr },
    difficulty: q.difficulty,
    xp: q.xp,
    steps: q.steps,
    due: q.dueAt ?? undefined,
    departmentId: q.departmentId,
    assigneeId: q.assigneeId ?? undefined,
    status: q.status,
    createdBy: q.createdById,
    requireFile: q.requireFile,
    instructions: { en: q.instructionsEn, ar: q.instructionsAr },
    estimatedMinutes: q.estimatedMinutes ?? undefined,
    subtasks: q.subtasks.map((st) => ({
      id: st.id,
      title: { en: st.titleEn, ar: st.titleAr },
      description: { en: st.descriptionEn, ar: st.descriptionAr },
    })),
    attachments: q.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileType: a.fileType ?? undefined,
      fileSize: a.fileSize,
    })),
  };
}

export function toAssignmentDto(
  a: QuestAssignment & { subtaskProgress?: { subtaskId: string }[] },
): AssignmentDto {
  return {
    id: a.id,
    userId: a.employeeId,
    questId: a.questId,
    state: a.status,
    stepsDone: a.stepsDone,
    completedSubtaskIds: (a.subtaskProgress ?? []).map((p) => p.subtaskId),
    acceptedAt: a.acceptedAt,
    submittedAt: a.submittedAt ?? undefined,
    approvedAt: a.approvedAt ?? undefined,
    approvedBy: a.reviewedById ?? undefined,
    rejectionNote: a.rejectionNote ?? undefined,
  };
}

export function toSubmissionDto(s: QuestSubmission, questId: string, departmentId: string | null): SubmissionDto {
  return {
    id: s.id,
    questId,
    userId: s.employeeId,
    departmentId,
    fileName: s.fileName ?? undefined,
    fileType: s.fileType ?? undefined,
    fileSize: s.fileSize ?? undefined,
    notes: s.notes ?? undefined,
    status: s.status,
    submittedAt: s.submittedAt,
    reviewedAt: s.reviewedAt ?? undefined,
    reviewedBy: undefined, // resolved by the caller when it has the assignment's reviewedById in hand
    feedback: s.feedback ?? undefined,
  };
}
