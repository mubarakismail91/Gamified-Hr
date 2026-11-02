import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { assertNotExpired } from '../common/utils/quest-expiry.util';
import { toSubmissionDto } from '../common/utils/quest.mapper';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type { SubmissionDto } from '../common/dto/quest.dto';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  async submit(
    dto: SubmitAssignmentDto,
    file: Express.Multer.File | undefined,
    employee: AuthenticatedUser,
  ): Promise<SubmissionDto> {
    const assignment = await this.prisma.questAssignment.findUnique({ where: { id: dto.assignmentId } });
    if (!assignment || assignment.employeeId !== employee.id) {
      throw new NotFoundException('Assignment not found.');
    }
    if (assignment.status !== 'accepted') {
      throw new BadRequestException('This quest is not ready to submit.');
    }
    const quest = await this.prisma.quest.findUniqueOrThrow({ where: { id: assignment.questId } });
    assertNotExpired(quest);
    if (assignment.stepsDone < quest.steps) {
      throw new BadRequestException('Complete all steps before submitting.');
    }

    const employeeRow = await this.prisma.user.findUniqueOrThrow({ where: { id: employee.id } });

    const [submission] = await this.prisma.$transaction([
      this.prisma.questSubmission.create({
        data: {
          assignmentId: assignment.id,
          employeeId: employee.id,
          // File is optional throughout — requireFile on the Quest is only
          // ever a soft recommendation shown in the UI, never enforced here.
          fileName: file?.originalname,
          filePath: file?.path,
          fileType: file?.mimetype,
          fileSize: file?.size,
          notes: dto.notes || undefined,
        },
      }),
      this.prisma.questAssignment.update({
        where: { id: assignment.id },
        data: { status: 'pending_approval', submittedAt: new Date(), rejectionNote: null },
      }),
    ]);

    if (employeeRow.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: employeeRow.departmentId } });
      if (dept?.managerId) {
        await this.prisma.notification.create({
          data: {
            userId: dept.managerId,
            kind: 'quest',
            titleEn: 'Quest submitted for review',
            titleAr: 'مهمة بانتظار مراجعتك',
            bodyEn: `${employeeRow.nameEn} submitted "${quest.titleEn}" for approval.`,
            bodyAr: `قدّم ${employeeRow.nameAr} مهمة "${quest.titleAr}" للمراجعة.`,
          },
        });
      }
    }

    return toSubmissionDto(submission, quest.id, employeeRow.departmentId);
  }

  /** Permission-checked lookup for the file-download endpoint — throws unless the viewer is the submitter, their department's manager, or an Admin. */
  async findDownloadable(submissionId: string, actor: AuthenticatedUser) {
    const submission = await this.prisma.questSubmission.findUnique({ where: { id: submissionId } });
    if (!submission || !submission.filePath) throw new NotFoundException('No file attached to this submission.');

    if (actor.role !== 'admin' && actor.id !== submission.employeeId) {
      const dept = await this.prisma.department.findFirst({ where: { managerId: actor.id } });
      const owner = await this.prisma.user.findUnique({ where: { id: submission.employeeId } });
      if (!dept || !owner || owner.departmentId !== dept.id) {
        throw new ForbiddenException("You don't have access to this file.");
      }
    }

    return submission;
  }
}
