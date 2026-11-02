import type { Bi } from './staff-member.dto';

/** Mirrors `Quest` in the frontend's src/data/types.ts. */
export interface QuestDto {
  id: string;
  title: Bi;
  description: Bi;
  cadence: 'daily' | 'epic';
  category: Bi;
  difficulty: 'easy' | 'medium' | 'hard';
  xp: number;
  steps: number;
  due?: Date;
  departmentId: string | null;
  assigneeId?: string;
  status: 'published' | 'draft';
  createdBy: string;
  requireFile?: boolean;
  instructions: Bi;
  estimatedMinutes?: number;
  subtasks: SubtaskDto[];
  attachments: QuestAttachmentDto[];
}

export interface SubtaskDto {
  id: string;
  title: Bi;
  description: Bi;
}

export interface QuestAttachmentDto {
  id: string;
  fileName: string;
  fileType?: string;
  fileSize: number;
}

/** Mirrors `UserQuest` in the frontend, plus `id` (needed to target advance/approve/reject by real id). */
export interface AssignmentDto {
  id: string;
  userId: string;
  questId: string;
  state: 'accepted' | 'pending_approval' | 'completed';
  stepsDone: number;
  completedSubtaskIds: string[];
  acceptedAt: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionNote?: string;
}

/** Mirrors `QuestSubmission` in the frontend. */
export interface SubmissionDto {
  id: string;
  questId: string;
  userId: string;
  departmentId: string | null;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  notes?: string;
  status: 'pending' | 'approved' | 'denied';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  feedback?: string;
}

export interface PendingApprovalDto {
  quest: QuestDto;
  progress: AssignmentDto;
  user: import('./staff-member.dto').StaffMemberDto;
  submission?: SubmissionDto;
}

export interface SubmissionHistoryRowDto {
  submission: SubmissionDto;
  quest: QuestDto;
  user: import('./staff-member.dto').StaffMemberDto;
}
