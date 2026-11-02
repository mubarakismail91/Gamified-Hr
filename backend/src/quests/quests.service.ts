import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import type { Quest } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { questInclude, toQuestDto } from '../common/utils/quest.mapper';
import type { SubtaskInputDto } from './dto/subtask-input.dto';
import { logAudit } from '../common/utils/audit.util';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type { QuestDto } from '../common/dto/quest.dto';

@Injectable()
export class QuestsService {
  constructor(private prisma: PrismaService) {}

  async findAllForViewer(viewer: AuthenticatedUser): Promise<QuestDto[]> {
    if (viewer.role === 'admin') {
      const quests = await this.prisma.quest.findMany({ include: questInclude, orderBy: { createdAt: 'desc' } });
      return quests.map(toQuestDto);
    }

    if (viewer.role === 'manager') {
      const dept = await this.prisma.department.findFirst({ where: { managerId: viewer.id } });
      if (!dept) return [];
      const quests = await this.prisma.quest.findMany({ where: { departmentId: dept.id }, include: questInclude, orderBy: { createdAt: 'desc' } });
      return quests.map(toQuestDto);
    }

    // Employee: published, and either university-wide, their department's, or
    // individually assigned to them — same rule as the demo's visibleQuestsFor.
    const employee = await this.prisma.user.findUniqueOrThrow({ where: { id: viewer.id } });
    const quests = await this.prisma.quest.findMany({
      where: {
        status: 'published',
        OR: [{ departmentId: null }, { departmentId: employee.departmentId ?? undefined }],
        AND: [{ OR: [{ assigneeId: null }, { assigneeId: viewer.id }] }],
      },
      include: questInclude,
      orderBy: { createdAt: 'desc' },
    });
    return quests.map(toQuestDto);
  }

  async create(dto: CreateQuestDto, actor: AuthenticatedUser): Promise<QuestDto> {
    const departmentId = await this.resolveWriteScope(actor, dto.departmentId);

    const quest = await this.prisma.quest.create({
      data: {
        titleEn: dto.titleEn,
        titleAr: dto.titleAr || dto.titleEn,
        descriptionEn: dto.descriptionEn ?? '',
        descriptionAr: dto.descriptionAr || dto.descriptionEn || '',
        categoryEn: dto.categoryEn || 'General',
        categoryAr: dto.categoryAr || dto.categoryEn || 'عام',
        cadence: dto.cadence,
        difficulty: dto.difficulty ?? 'medium',
        xp: dto.xp,
        instructionsEn: dto.instructionsEn ?? '',
        instructionsAr: dto.instructionsAr || dto.instructionsEn || '',
        estimatedMinutes: dto.estimatedMinutes,
        steps: dto.subtasks?.length ? dto.subtasks.length : (dto.steps ?? 1),
        subtasks: {
          create: (dto.subtasks ?? []).map((st, position) => ({
            titleEn: st.titleEn,
            titleAr: st.titleAr || st.titleEn,
            descriptionEn: st.descriptionEn ?? '',
            descriptionAr: st.descriptionAr || st.descriptionEn || '',
            position,
          })),
        },
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        requireFile: dto.requireFile ?? false,
        status: dto.status ?? 'published',
        departmentId,
        assigneeId: dto.assigneeId,
        createdById: actor.id,
      },
      include: questInclude,
    });

    await logAudit(this.prisma, {
      actorId: actor.id,
      action: quest.status === 'published' ? 'quest.published' : 'quest.draft_saved',
      targetType: 'Quest',
      targetId: quest.id,
      metadata: { titleEn: quest.titleEn },
    });

    if (quest.status === 'published') {
      await this.notifyPublishedQuest(quest);
    }

    return toQuestDto(quest);
  }

  async update(id: string, dto: UpdateQuestDto, actor: AuthenticatedUser): Promise<QuestDto> {
    const existing = await this.findOwnedOrThrow(id, actor);

    // A Manager editing departmentId can't move the quest to someone else's
    // department or university-wide — same "own department only" boundary as create.
    const departmentId =
      dto.departmentId !== undefined ? await this.resolveWriteScope(actor, dto.departmentId) : undefined;

    const quest = await this.prisma.quest.update({
      where: { id: existing.id },
      data: {
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        categoryEn: dto.categoryEn,
        categoryAr: dto.categoryAr,
        cadence: dto.cadence,
        difficulty: dto.difficulty,
        xp: dto.xp,
        instructionsEn: dto.instructionsEn,
        instructionsAr: dto.instructionsAr,
        estimatedMinutes: dto.estimatedMinutes,
        steps: dto.steps,
        dueAt: dto.dueAt !== undefined ? (dto.dueAt ? new Date(dto.dueAt) : null) : undefined,
        requireFile: dto.requireFile,
        status: dto.status,
        departmentId,
        assigneeId: dto.assigneeId,
      },
    });

    if (dto.subtasks !== undefined) await this.replaceSubtasks(existing.id, dto.subtasks);

    await logAudit(this.prisma, { actorId: actor.id, action: 'quest.updated', targetType: 'Quest', targetId: id });

    // Only the moment a quest first becomes visible to Employees — editing an
    // already-published quest (title, XP, etc.) doesn't re-notify everyone.
    if (existing.status !== 'published' && quest.status === 'published') {
      await this.notifyPublishedQuest(quest);
    }

    return this.findOneDto(quest.id);
  }

  /**
   * Syncs the quest's checklist to `inputs`: matching ids are updated, new ones created, the rest removed
   * (their ticks cascade away). Then keeps `steps` and in-progress assignments' `stepsDone` consistent.
   */
  private async replaceSubtasks(questId: string, inputs: SubtaskInputDto[]): Promise<void> {
    const current = await this.prisma.questSubtask.findMany({ where: { questId }, select: { id: true } });
    const currentIds = new Set(current.map((c) => c.id));
    const keptIds = new Set(inputs.flatMap((i) => (i.id && currentIds.has(i.id) ? [i.id] : [])));

    await this.prisma.$transaction([
      this.prisma.questSubtask.deleteMany({ where: { questId, id: { notIn: [...keptIds] } } }),
      ...inputs.map((st, position) => {
        const data = {
          titleEn: st.titleEn,
          titleAr: st.titleAr || st.titleEn,
          descriptionEn: st.descriptionEn ?? '',
          descriptionAr: st.descriptionAr || st.descriptionEn || '',
          position,
        };
        return st.id && keptIds.has(st.id)
          ? this.prisma.questSubtask.update({ where: { id: st.id }, data })
          : this.prisma.questSubtask.create({ data: { ...data, questId } });
      }),
      this.prisma.quest.update({ where: { id: questId }, data: { steps: Math.max(1, inputs.length) } }),
    ]);

    // Subtasks were removed/added, so unfinished assignments' tick counts may have changed.
    if (inputs.length === 0) return;
    const open = await this.prisma.questAssignment.findMany({
      where: { questId, status: 'accepted' },
      select: { id: true },
    });
    await Promise.all(
      open.map(async (a) =>
        this.prisma.questAssignment.update({
          where: { id: a.id },
          data: { stepsDone: await this.prisma.assignmentSubtask.count({ where: { assignmentId: a.id } }) },
        }),
      ),
    );
  }

  async findOneDto(id: string): Promise<QuestDto> {
    return toQuestDto(await this.prisma.quest.findUniqueOrThrow({ where: { id }, include: questInclude }));
  }

  async addAttachment(id: string, file: Express.Multer.File | undefined, actor: AuthenticatedUser): Promise<QuestDto> {
    if (!file) throw new BadRequestException('No file uploaded.');
    try {
      await this.findOwnedOrThrow(id, actor);
    } catch (err) {
      await unlink(file.path).catch(() => undefined); // don't leave orphaned uploads behind
      throw err;
    }
    await this.prisma.questAttachment.create({
      data: {
        questId: id,
        fileName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    });
    await logAudit(this.prisma, {
      actorId: actor.id,
      action: 'quest.updated',
      targetType: 'Quest',
      targetId: id,
      metadata: { attached: file.originalname },
    });
    return this.findOneDto(id);
  }

  async removeAttachment(id: string, attachmentId: string, actor: AuthenticatedUser): Promise<QuestDto> {
    await this.findOwnedOrThrow(id, actor);
    const attachment = await this.prisma.questAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.questId !== id) throw new NotFoundException('Attachment not found.');
    await this.prisma.questAttachment.delete({ where: { id: attachmentId } });
    await unlink(attachment.filePath).catch(() => undefined);
    return this.findOneDto(id);
  }

  /** Anyone who can see the quest in their catalogue can download its attachments. */
  async findDownloadableAttachment(id: string, attachmentId: string, viewer: AuthenticatedUser) {
    const visible = await this.findAllForViewer(viewer);
    if (!visible.some((q) => q.id === id)) throw new NotFoundException('Attachment not found.');
    const attachment = await this.prisma.questAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.questId !== id) throw new NotFoundException('Attachment not found.');
    return attachment;
  }

  /** Notifies every Employee who can now see this quest — same audience rule as findAllForViewer's Employee branch. */
  private async notifyPublishedQuest(quest: Quest): Promise<void> {
    let employeeIds: string[];

    if (quest.assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: quest.assigneeId } });
      employeeIds = assignee && assignee.isActive && assignee.role === 'employee' ? [assignee.id] : [];
    } else {
      const employees = await this.prisma.user.findMany({
        where: { role: 'employee', isActive: true, ...(quest.departmentId ? { departmentId: quest.departmentId } : {}) },
        select: { id: true },
      });
      employeeIds = employees.map((e) => e.id);
    }

    if (employeeIds.length === 0) return;

    await this.prisma.notification.createMany({
      data: employeeIds.map((userId) => ({
        userId,
        kind: 'quest' as const,
        titleEn: 'New quest available',
        titleAr: 'مهمة جديدة متاحة',
        bodyEn: `"${quest.titleEn}" — +${quest.xp} XP`,
        bodyAr: `"${quest.titleAr}" — +${quest.xp} نقطة خبرة`,
      })),
    });
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<{ deleted: boolean }> {
    const existing = await this.findOwnedOrThrow(id, actor);

    // Cascade in FK-safe order: submissions -> assignments -> quest.
    const assignmentIds = (
      await this.prisma.questAssignment.findMany({ where: { questId: existing.id }, select: { id: true } })
    ).map((a) => a.id);

    const attachments = await this.prisma.questAttachment.findMany({ where: { questId: existing.id } });

    await this.prisma.$transaction([
      this.prisma.questSubmission.deleteMany({ where: { assignmentId: { in: assignmentIds } } }),
      this.prisma.questAssignment.deleteMany({ where: { questId: existing.id } }),
      this.prisma.quest.delete({ where: { id: existing.id } }),
    ]);

    await Promise.all(attachments.map((a) => unlink(a.filePath).catch(() => undefined)));

    await logAudit(this.prisma, {
      actorId: actor.id,
      action: 'quest.deleted',
      targetType: 'Quest',
      targetId: id,
      metadata: { titleEn: existing.titleEn },
    });
    return { deleted: true };
  }

  /** Admin: whatever departmentId was requested (including null for university-wide). Manager: always their own department, regardless of what was requested. */
  private async resolveWriteScope(actor: AuthenticatedUser, requested: string | null | undefined) {
    if (actor.role === 'admin') return requested ?? null;

    const dept = await this.prisma.department.findFirst({ where: { managerId: actor.id } });
    if (!dept) throw new ForbiddenException("You don't manage a department.");
    return dept.id;
  }

  private async findOwnedOrThrow(id: string, actor: AuthenticatedUser) {
    const quest = await this.prisma.quest.findUnique({ where: { id } });
    if (!quest) throw new NotFoundException('Quest not found.');
    if (actor.role === 'admin') return quest;

    const dept = await this.prisma.department.findFirst({ where: { managerId: actor.id } });
    if (!dept || quest.departmentId !== dept.id) {
      throw new ForbiddenException("You can only manage your own department's quests.");
    }
    return quest;
  }
}
