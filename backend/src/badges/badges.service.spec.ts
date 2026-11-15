import { BadRequestException } from '@nestjs/common';
import { BadgesService } from './badges.service';
import type { PrismaService } from '../prisma/prisma.service';

const employee = { id: 'e1', role: 'employee', isActive: true, createdAt: new Date('2026-11-01T00:00:00Z') };

function fakePrisma(overrides: Record<string, unknown> = {}) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(employee) },
    badge: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    userBadge: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn() },
    questAssignment: { count: jest.fn().mockResolvedValue(0) },
    activityLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
  return prisma;
}

const firstQuestBadge = { id: 'b-first', nameEn: 'First Step', nameAr: 'الخطوة الأولى', criteria: { type: 'questsAccepted', count: 1 } };
const mentorBadge = { id: 'b-mentor', nameEn: 'Mentor', nameAr: 'موجّه', criteria: null };

describe('BadgesService.evaluate', () => {
  it('grants an automatic badge once its requirement is met', async () => {
    const prisma = fakePrisma();
    prisma.badge.findMany.mockResolvedValue([firstQuestBadge]);
    prisma.questAssignment.count.mockResolvedValue(1);

    await new BadgesService(prisma as unknown as PrismaService).evaluate('e1');

    expect(prisma.userBadge.create).toHaveBeenCalledWith({ data: { userId: 'e1', badgeId: 'b-first', awardedById: null } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not grant a badge whose requirement is not met yet', async () => {
    const prisma = fakePrisma();
    prisma.badge.findMany.mockResolvedValue([firstQuestBadge]);
    prisma.questAssignment.count.mockResolvedValue(0);

    await new BadgesService(prisma as unknown as PrismaService).evaluate('e1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('skips badges already earned and admin-only badges', async () => {
    const prisma = fakePrisma();
    prisma.badge.findMany.mockResolvedValue([firstQuestBadge, mentorBadge]);
    prisma.userBadge.findMany.mockResolvedValue([{ badgeId: 'b-first' }]);
    prisma.questAssignment.count.mockResolvedValue(9);

    await new BadgesService(prisma as unknown as PrismaService).evaluate('e1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('never gives badges to managers or admins', async () => {
    const prisma = fakePrisma();
    prisma.user.findUnique.mockResolvedValue({ ...employee, role: 'manager' });
    prisma.badge.findMany.mockResolvedValue([firstQuestBadge]);

    await new BadgesService(prisma as unknown as PrismaService).evaluate('e1');

    expect(prisma.badge.findMany).not.toHaveBeenCalled();
  });

  it('never throws, so a badge failure cannot break the action that triggered it', async () => {
    const prisma = fakePrisma();
    prisma.badge.findMany.mockRejectedValue(new Error('db down'));
    const service = new BadgesService(prisma as unknown as PrismaService);
    jest.spyOn((service as unknown as { logger: { error: () => void } }).logger, 'error').mockImplementation(() => undefined);

    await expect(service.evaluate('e1')).resolves.toBeUndefined();
  });

  it('treats a duplicate grant from a concurrent evaluation as a no-op', async () => {
    const prisma = fakePrisma();
    prisma.badge.findMany.mockResolvedValue([firstQuestBadge]);
    prisma.questAssignment.count.mockResolvedValue(1);
    prisma.$transaction.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const service = new BadgesService(prisma as unknown as PrismaService);
    const logSpy = jest
      .spyOn((service as unknown as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation(() => undefined);

    await service.evaluate('e1');

    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe('BadgesService.award (admin grant)', () => {
  it('refuses to hand-award a badge that has an automatic rule', async () => {
    const prisma = fakePrisma();
    prisma.badge.findUnique.mockResolvedValue(firstQuestBadge);

    await expect(new BadgesService(prisma as unknown as PrismaService).award('e1', 'b-first', 'admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses to award the same badge twice', async () => {
    const prisma = fakePrisma();
    prisma.badge.findUnique.mockResolvedValue(mentorBadge);
    prisma.userBadge.findUnique.mockResolvedValue({ userId: 'e1', badgeId: 'b-mentor' });

    await expect(new BadgesService(prisma as unknown as PrismaService).award('e1', 'b-mentor', 'admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('BadgesService.setFeatured', () => {
  it('only lets an employee feature badges they have earned', async () => {
    const prisma = fakePrisma();
    prisma.userBadge.findMany.mockResolvedValue([{ badgeId: 'b-first' }]);

    await expect(
      new BadgesService(prisma as unknown as PrismaService).setFeatured('e1', ['b-first', 'b-mentor']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
