import { BadRequestException } from '@nestjs/common';
import { computeStatus, K_ANONYMITY_THRESHOLD, SurveysService } from './surveys.service';
import type { PrismaService } from '../prisma/prisma.service';

const NOW = new Date('2026-11-15T12:00:00Z');
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000);

describe('computeStatus', () => {
  it('is scheduled before it opens', () => {
    expect(computeStatus(daysFromNow(1), null, NOW)).toBe('scheduled');
  });
  it('is open between the dates, or forever with no closing date', () => {
    expect(computeStatus(daysFromNow(-1), daysFromNow(1), NOW)).toBe('open');
    expect(computeStatus(daysFromNow(-1), null, NOW)).toBe('open');
  });
  it('is closed after the closing date', () => {
    expect(computeStatus(daysFromNow(-10), daysFromNow(-1), NOW)).toBe('closed');
  });
});

// Questions q-a (autonomy), q-c (competence), q-r (relatedness).
const questions = [
  { id: 'q-a', scale: 'autonomy' },
  { id: 'q-c', scale: 'competence' },
  { id: 'q-r', scale: 'relatedness' },
];
const response = (a: number, c: number, r: number) => ({ answers: { 'q-a': a, 'q-c': c, 'q-r': r } });

function fakePrisma() {
  return {
    surveyRound: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    surveyResponse: { findMany: jest.fn(), create: jest.fn().mockReturnValue('response-op') },
    surveyQuestion: { findMany: jest.fn().mockResolvedValue(questions) },
    surveyParticipation: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockReturnValue('participation-op') },
    user: {
      count: jest.fn().mockResolvedValue(10),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ generation: null, staffType: null }),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

describe('SurveysService.getScores (k-anonymity)', () => {
  it('uses a threshold of 5 respondents', () => {
    expect(K_ANONYMITY_THRESHOLD).toBe(5);
  });

  it('reports nothing when there is no round', async () => {
    const prisma = fakePrisma();
    prisma.surveyRound.findFirst.mockResolvedValue(null);
    const result = await new SurveysService(prisma as unknown as PrismaService).getScores();
    expect(result).toEqual({ scores: [], respondentCount: 0, suppressed: true });
  });

  it('suppresses averages with 4 respondents (one below the threshold)', async () => {
    const prisma = fakePrisma();
    prisma.surveyRound.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.surveyResponse.findMany.mockResolvedValue([response(5, 5, 5), response(1, 1, 1), response(3, 3, 3), response(4, 4, 4)]);

    const result = await new SurveysService(prisma as unknown as PrismaService).getScores('r1');

    expect(result).toEqual({ scores: [], respondentCount: 4, suppressed: true });
  });

  it('reports per-need averages, rounded to one decimal, at exactly 5 respondents', async () => {
    const prisma = fakePrisma();
    prisma.surveyRound.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.surveyResponse.findMany.mockResolvedValue([
      response(5, 4, 1),
      response(4, 4, 2),
      response(4, 3, 3),
      response(3, 4, 4),
      response(5, 4, 5),
    ]);

    const result = await new SurveysService(prisma as unknown as PrismaService).getScores('r1');

    expect(result.suppressed).toBe(false);
    expect(result.respondentCount).toBe(5);
    expect(result.scores.map((s) => [s.scale.en, s.score])).toEqual([
      ['Autonomy', 4.2],
      ['Competence', 3.8],
      ['Relatedness', 3],
    ]);
  });

  it('ignores answers to questions that are not in the round', async () => {
    const prisma = fakePrisma();
    prisma.surveyRound.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.surveyResponse.findMany.mockResolvedValue(
      Array.from({ length: 5 }, () => ({ answers: { 'q-a': 2, 'q-c': 2, 'q-r': 2, 'q-unknown': 5 } })),
    );

    const result = await new SurveysService(prisma as unknown as PrismaService).getScores('r1');

    expect(result.scores.every((s) => s.score === 2)).toBe(true);
  });
});

describe('SurveysService.submitResponse', () => {
  const openRound = {
    id: 'r1',
    opensAt: new Date(Date.now() - 86_400_000),
    closesAt: new Date(Date.now() + 86_400_000),
    questions,
  };
  const goodAnswers = { answers: { 'q-a': 4, 'q-c': 3, 'q-r': 5 } };

  it('stores the answers WITHOUT a user id, and participation separately', async () => {
    const prisma = fakePrisma();
    prisma.surveyRound.findUnique.mockResolvedValue(openRound);

    await new SurveysService(prisma as unknown as PrismaService).submitResponse('r1', goodAnswers, 'e1');

    const responseData = prisma.surveyResponse.create.mock.calls[0][0].data;
    expect(responseData).toEqual({ roundId: 'r1', answers: goodAnswers.answers, generation: null, staffType: null });
    expect(responseData).not.toHaveProperty('userId');
    expect(prisma.surveyParticipation.create).toHaveBeenCalledWith({ data: { roundId: 'r1', userId: 'e1' } });
    expect(prisma.$transaction).toHaveBeenCalledWith(['response-op', 'participation-op']);
  });

  it('rejects a round that is not open', async () => {
    const prisma = fakePrisma();
    prisma.surveyRound.findUnique.mockResolvedValue({ ...openRound, closesAt: new Date(Date.now() - 1000) });
    await expect(
      new SurveysService(prisma as unknown as PrismaService).submitResponse('r1', goodAnswers, 'e1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a second response from the same person', async () => {
    const prisma = fakePrisma();
    prisma.surveyRound.findUnique.mockResolvedValue(openRound);
    prisma.surveyParticipation.findUnique.mockResolvedValue({ roundId: 'r1', userId: 'e1' });
    await expect(
      new SurveysService(prisma as unknown as PrismaService).submitResponse('r1', goodAnswers, 'e1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['a missing question', { 'q-a': 4, 'q-c': 3 }],
    ['an extra question', { 'q-a': 4, 'q-c': 3, 'q-r': 5, 'q-x': 1 }],
    ['a value above 5', { 'q-a': 6, 'q-c': 3, 'q-r': 5 }],
    ['a value below 1', { 'q-a': 0, 'q-c': 3, 'q-r': 5 }],
    ['a non-integer value', { 'q-a': 2.5, 'q-c': 3, 'q-r': 5 }],
  ])('rejects answers with %s', async (_label, answers) => {
    const prisma = fakePrisma();
    prisma.surveyRound.findUnique.mockResolvedValue(openRound);
    await expect(
      new SurveysService(prisma as unknown as PrismaService).submitResponse('r1', { answers }, 'e1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('SurveysService.createRound', () => {
  const base = { titleEn: 'Pulse', opensAt: '2026-11-16T00:00:00Z' };

  it('requires at least one question for each SDT need', async () => {
    const prisma = fakePrisma();
    await expect(
      new SurveysService(prisma as unknown as PrismaService).createRound(
        { ...base, questionKeys: ['aut-input', 'com-effective'] },
        'admin',
      ),
    ).rejects.toThrow('Pick at least one relatedness question.');
  });

  it('rejects a question key that is not in the bank', async () => {
    const prisma = fakePrisma();
    await expect(
      new SurveysService(prisma as unknown as PrismaService).createRound(
        { ...base, questionKeys: ['aut-input', 'com-effective', 'rel-belong', 'made-up'] },
        'admin',
      ),
    ).rejects.toThrow('Unknown survey question.');
  });

  it('uses the six default questions when none are picked', async () => {
    const prisma = fakePrisma();
    prisma.surveyRound.create.mockResolvedValue({ id: 'r1', titleEn: 'Pulse', titleAr: 'Pulse', opensAt: new Date(), closesAt: null, targetCount: 10 });

    await new SurveysService(prisma as unknown as PrismaService).createRound(base, 'admin');

    const created = prisma.surveyRound.create.mock.calls[0][0].data.questions.create;
    expect(created).toHaveLength(6);
  });
});
