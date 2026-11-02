import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { assignmentInclude, questInclude, toAssignmentDto, toQuestDto, toSubmissionDto } from '../common/utils/quest.mapper';
import { buildStaffMemberDto } from '../common/utils/build-staff-member';
import { assertNotExpired } from '../common/utils/quest-expiry.util';
import { logAudit } from '../common/utils/audit.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type { AssignmentDto, PendingApprovalDto, SubmissionHistoryRowDto } from '../common/dto/quest.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    private prisma: PrismaService,
    private badges: BadgesService,
  ) {}

  async findMine(employeeId: string): Promise<AssignmentDto[]> {
    const rows = await this.prisma.questAssignment.findMany({ where: { employeeId }, include: assignmentInclude });
    return rows.map(toAssignmentDto);
  }

  async accept(questId: string, employee: AuthenticatedUser): Promise<AssignmentDto> {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || quest.status !== 'published') throw new NotFoundException('Quest not found.');
    assertNotExpired(quest);

    const employeeRow = await this.prisma.user.findUniqueOrThrow({ where: { id: employee.id } });
    const visible =
      (quest.departmentId === null || quest.departmentId === employeeRow.departmentId) &&
      (!quest.assigneeId || quest.assigneeId === employee.id);
    if (!visible) throw new ForbiddenException("This quest isn't available to you.");

    const existing = await this.prisma.questAssignment.findUnique({
      where: { questId_employeeId: { questId, employeeId: employee.id } },
    });
    if (existing) return toAssignmentDto(existing); // idempotent — already accepted

    const assignment = await this.prisma.questAssignment.create({
      data: { questId, employeeId: employee.id },
    });
    await this.badges.evaluate(employee.id);
    return toAssignmentDto(assignment);
  }

  async advance(assignmentId: string, employee: AuthenticatedUser): Promise<AssignmentDto> {
    const assignment = await this.ownedByEmployeeOrThrow(assignmentId, employee.id);
    if (assignment.status !== 'accepted') {
      throw new BadRequestException('This quest is not in progress.');
    }
    const quest = await this.prisma.quest.findUniqueOrThrow({ where: { id: assignment.questId } });
    assertNotExpired(quest);
    if ((await this.prisma.questSubtask.count({ where: { questId: quest.id } })) > 0) {
      throw new BadRequestException('Tick off the quest\'s subtasks instead.');
    }

    const updated = await this.prisma.questAssignment.update({
      where: { id: assignment.id },
      data: { stepsDone: Math.min(quest.steps, assignment.stepsDone + 1) },
    });
    return toAssignmentDto(updated);
  }

  /** Ticks (or un-ticks) one subtask; `stepsDone` always mirrors the number of ticked subtasks. */
  async toggleSubtask(assignmentId: string, subtaskId: string, employee: AuthenticatedUser): Promise<AssignmentDto> {
    const assignment = await this.ownedByEmployeeOrThrow(assignmentId, employee.id);
    if (assignment.status !== 'accepted') {
      throw new BadRequestException('This quest is not in progress.');
    }
    const subtask = await this.prisma.questSubtask.findUnique({ where: { id: subtaskId } });
    if (!subtask || subtask.questId !== assignment.questId) throw new NotFoundException('Subtask not found.');
    assertNotExpired(await this.prisma.quest.findUniqueOrThrow({ where: { id: assignment.questId } }));

    const key = { assignmentId_subtaskId: { assignmentId: assignment.id, subtaskId } };
    const ticked = await this.prisma.assignmentSubtask.findUnique({ where: key });
    if (ticked) {
      await this.prisma.assignmentSubtask.delete({ where: key });
    } else {
      await this.prisma.assignmentSubtask.create({ data: { assignmentId: assignment.id, subtaskId } });
    }

    const stepsDone = await this.prisma.assignmentSubtask.count({ where: { assignmentId: assignment.id } });
    const updated = await this.prisma.questAssignment.update({
      where: { id: assignment.id },
      data: { stepsDone },
      include: assignmentInclude,
    });
    return toAssignmentDto(updated);
  }

  async approve(assignmentId: string, actor: AuthenticatedUser): Promise<AssignmentDto> {
    const { assignment, quest } = await this.reviewableOrThrow(assignmentId, actor);

    const pending = await this.prisma.questSubmission.findFirst({
      where: { assignmentId: assignment.id, status: 'pending' },
    });
    if (!pending) throw new BadRequestException('No pending submission to approve.');

    const [updatedAssignment] = await this.prisma.$transaction([
      this.prisma.questAssignment.update({
        where: { id: assignment.id },
        data: { status: 'completed', approvedAt: new Date(), reviewedById: actor.id },
      }),
      this.prisma.questSubmission.update({
        where: { id: pending.id },
        data: { status: 'approved', reviewedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: assignment.employeeId },
        data: { totalXp: { increment: quest.xp } },
      }),
      this.prisma.activityLog.create({
        data: {
          userId: assignment.employeeId,
          kind: 'quest',
          textEn: `Completed quest: ${quest.titleEn}`,
          textAr: `أتمّ مهمة: ${quest.titleAr}`,
          xpDelta: quest.xp,
          refType: 'Quest',
          refId: quest.id,
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: assignment.employeeId,
          kind: 'xp',
          titleEn: `+${quest.xp} XP earned`,
          titleAr: `+${quest.xp} نقطة`,
          bodyEn: `"${quest.titleEn}" was approved by your manager.`,
          bodyAr: `تمت الموافقة على "${quest.titleAr}" من قِبل مديرك.`,
        },
      }),
    ]);

    // Completing a quest on a skill path starts (follows) that path for the employee; the level itself is
    // derived from their completed quests, so there's nothing else to record.
    if (quest.skillBranch) {
      await this.prisma.userSkillPath.upsert({
        where: { userId_branch: { userId: assignment.employeeId, branch: quest.skillBranch } },
        create: { userId: assignment.employeeId, branch: quest.skillBranch },
        update: {},
      });
    }

    await logAudit(this.prisma, {
      actorId: actor.id,
      action: 'assignment.approved',
      targetType: 'QuestAssignment',
      targetId: assignment.id,
      metadata: { questTitle: quest.titleEn, xp: quest.xp },
    });

    await this.badges.evaluate(assignment.employeeId);
    return toAssignmentDto(updatedAssignment);
  }

  async reject(assignmentId: string, note: string | undefined, actor: AuthenticatedUser): Promise<AssignmentDto> {
    const { assignment, quest } = await this.reviewableOrThrow(assignmentId, actor);

    const pending = await this.prisma.questSubmission.findFirst({
      where: { assignmentId: assignment.id, status: 'pending' },
    });
    if (!pending) throw new BadRequestException('No pending submission to reject.');

    const [updatedAssignment] = await this.prisma.$transaction([
      this.prisma.questAssignment.update({
        where: { id: assignment.id },
        data: { status: 'accepted', rejectionNote: note, submittedAt: null },
      }),
      this.prisma.questSubmission.update({
        where: { id: pending.id },
        data: { status: 'denied', reviewedAt: new Date(), feedback: note },
      }),
      this.prisma.notification.create({
        data: {
          userId: assignment.employeeId,
          kind: 'quest',
          titleEn: 'Submission returned',
          titleAr: 'أُعيدت المهمة',
          bodyEn: note
            ? `"${quest.titleEn}" needs another look: ${note}`
            : `"${quest.titleEn}" was returned for more work.`,
          bodyAr: note
            ? `مهمة "${quest.titleAr}" تحتاج مراجعة: ${note}`
            : `أُعيدت مهمة "${quest.titleAr}" لمزيد من العمل.`,
        },
      }),
    ]);

    await logAudit(this.prisma, {
      actorId: actor.id,
      action: 'assignment.rejected',
      targetType: 'QuestAssignment',
      targetId: assignment.id,
    });

    return toAssignmentDto(updatedAssignment);
  }

  async pendingApprovals(actor: AuthenticatedUser, departmentId?: string | null): Promise<PendingApprovalDto[]> {
    const scopedDeptId = await this.resolveReadScope(actor, departmentId);

    const assignments = await this.prisma.questAssignment.findMany({
      where: {
        status: 'pending_approval',
        employee: scopedDeptId === null ? {} : { departmentId: scopedDeptId },
      },
      include: assignmentInclude,
      orderBy: { submittedAt: 'desc' },
    });

    return Promise.all(
      assignments.map(async (a) => {
        const [quest, user, submission] = await Promise.all([
          this.prisma.quest.findUniqueOrThrow({ where: { id: a.questId }, include: questInclude }),
          buildStaffMemberDto(this.prisma, a.employeeId, { includePeriodStats: false }),
          this.prisma.questSubmission.findFirst({
            where: { assignmentId: a.id, status: 'pending' },
            orderBy: { submittedAt: 'desc' },
          }),
        ]);
        return {
          quest: toQuestDto(quest),
          progress: toAssignmentDto(a),
          user,
          submission: submission ? toSubmissionDto(submission, a.questId, user.departmentId) : undefined,
        };
      }),
    );
  }

  async history(actor: AuthenticatedUser, departmentId?: string | null): Promise<SubmissionHistoryRowDto[]> {
    const scopedDeptId = await this.resolveReadScope(actor, departmentId);

    const submissions = await this.prisma.questSubmission.findMany({
      where: {
        status: { not: 'pending' },
        employee: scopedDeptId === null ? {} : { departmentId: scopedDeptId },
      },
      include: { assignment: true },
      orderBy: { reviewedAt: 'desc' },
    });

    return Promise.all(
      submissions.map(async (s) => {
        const [quest, user] = await Promise.all([
          this.prisma.quest.findUniqueOrThrow({ where: { id: s.assignment.questId }, include: questInclude }),
          buildStaffMemberDto(this.prisma, s.employeeId, { includePeriodStats: false }),
        ]);
        const dto = toSubmissionDto(s, s.assignment.questId, user.departmentId);
        dto.reviewedBy = s.assignment.reviewedById ?? undefined;
        return { submission: dto, quest: toQuestDto(quest), user };
      }),
    );
  }

  // ---------------------------------------------------------------------

  private async ownedByEmployeeOrThrow(assignmentId: string, employeeId: string) {
    const assignment = await this.prisma.questAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.employeeId !== employeeId) {
      throw new NotFoundException('Assignment not found.');
    }
    return assignment;
  }

  /** Manager/Admin permission check for approve/reject — resolves the assignment + its quest, or throws. */
  private async reviewableOrThrow(assignmentId: string, actor: AuthenticatedUser) {
    const assignment = await this.prisma.questAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found.');

    if (actor.role !== 'admin') {
      const dept = await this.prisma.department.findFirst({ where: { managerId: actor.id } });
      const employee = await this.prisma.user.findUnique({ where: { id: assignment.employeeId } });
      if (!dept || !employee || employee.departmentId !== dept.id) {
        throw new ForbiddenException("You can only review your own department's submissions.");
      }
    }

    const quest = await this.prisma.quest.findUniqueOrThrow({ where: { id: assignment.questId } });
    return { assignment, quest };
  }

  /** Manager: always their own department, ignoring the request. Admin: the requested department, or null (every department) when omitted. */
  private async resolveReadScope(actor: AuthenticatedUser, requested?: string | null): Promise<string | null> {
    if (actor.role === 'admin') return requested ?? null;
    const dept = await this.prisma.department.findFirst({ where: { managerId: actor.id } });
    if (!dept) throw new ForbiddenException("You don't manage a department.");
    return dept.id;
  }
}
