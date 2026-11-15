import { bearer, createDepartment, createQuest, createTestApp, login, resetDatabase, type TestContext } from './support/app';

/**
 * The core gamification loop, end to end through the API, as walked through
 * manually in Section 6.2 of the midterm report: a manager publishes a quest,
 * an employee accepts, works and submits it, the manager approves, and XP,
 * notifications, the leaderboard and the audit trail all update.
 */
describe('Quest lifecycle (API)', () => {
  let ctx: TestContext;
  let team: Awaited<ReturnType<typeof createDepartment>>;
  let managerToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    team = await createDepartment(ctx.prisma, 'Research');
    managerToken = await login(ctx, team.manager.email);
    employeeToken = await login(ctx, team.employee.email);
  });

  afterAll(() => ctx.app.close());

  it('publish -> accept -> progress -> submit -> approve awards XP exactly once', async () => {
    // Manager publishes a 2-step quest worth 120 XP.
    const quest = await ctx
      .http()
      .post('/quests')
      .set(bearer(managerToken))
      .send({ titleEn: 'Write a teaching reflection', cadence: 'epic', xp: 120, steps: 2, status: 'published' })
      .expect(201);

    // Employee sees it and accepts it.
    const visible = await ctx.http().get('/quests').set(bearer(employeeToken)).expect(200);
    expect(visible.body.map((q: { id: string }) => q.id)).toContain(quest.body.id);
    const accepted = await ctx.http().post('/assignments').set(bearer(employeeToken)).send({ questId: quest.body.id }).expect(201);
    const assignmentId: string = accepted.body.id;
    expect(accepted.body.state).toBe('accepted');

    // Can't submit before every step is done.
    await ctx.http().post('/submissions').set(bearer(employeeToken)).field('assignmentId', assignmentId).expect(400);

    // Two steps of progress (a third is capped at the quest's step count).
    await ctx.http().patch(`/assignments/${assignmentId}/advance`).set(bearer(employeeToken)).expect(200);
    await ctx.http().patch(`/assignments/${assignmentId}/advance`).set(bearer(employeeToken)).expect(200);
    const capped = await ctx.http().patch(`/assignments/${assignmentId}/advance`).set(bearer(employeeToken)).expect(200);
    expect(capped.body.stepsDone).toBe(2);

    // Submit with an evidence file.
    await ctx
      .http()
      .post('/submissions')
      .set(bearer(employeeToken))
      .field('assignmentId', assignmentId)
      .field('notes', 'Reflection attached.')
      .attach('file', Buffer.from('%PDF-1.4 test evidence'), { filename: 'reflection.pdf', contentType: 'application/pdf' })
      .expect(201);

    // It appears in the manager's approval queue, and the manager was notified.
    const pending = await ctx.http().get('/assignments/pending').set(bearer(managerToken)).expect(200);
    expect(pending.body).toHaveLength(1);
    expect(pending.body[0].submission.fileName).toBe('reflection.pdf');
    expect(await ctx.prisma.notification.count({ where: { userId: team.manager.id, kind: 'quest' } })).toBe(1);

    // Approve.
    const approved = await ctx.http().post(`/assignments/${assignmentId}/approve`).set(bearer(managerToken)).expect(201);
    expect(approved.body.state).toBe('completed');

    // XP, activity log, notification and audit trail all updated once.
    const employee = await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } });
    expect(employee.totalXp).toBe(120);
    const xpRows = await ctx.prisma.activityLog.findMany({ where: { userId: team.employee.id, kind: 'quest' } });
    expect(xpRows.map((r) => r.xpDelta)).toEqual([120]);
    expect(await ctx.prisma.notification.count({ where: { userId: team.employee.id, kind: 'xp' } })).toBe(1);
    expect(await ctx.prisma.auditLog.count({ where: { action: 'assignment.approved', targetId: assignmentId } })).toBe(1);

    // The queue is empty again and a second approval is refused.
    const after = await ctx.http().get('/assignments/pending').set(bearer(managerToken)).expect(200);
    expect(after.body).toHaveLength(0);
    await ctx.http().post(`/assignments/${assignmentId}/approve`).set(bearer(managerToken)).expect(400);
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } })).totalXp).toBe(120);

    // The employee now leads this week's department leaderboard.
    const board = await ctx.http().get('/leaderboard?period=week&scope=dept').set(bearer(employeeToken)).expect(200);
    const top = board.body[0];
    expect(top.position).toBe(1);
    expect(top.points).toBe(120);
    expect(top.staff.name.en).toBe(team.employee.nameEn);
  });

  it('reject returns the quest with a note, awards nothing, and allows a resubmission', async () => {
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id, xp: 40 });
    const accepted = await ctx.http().post('/assignments').set(bearer(employeeToken)).send({ questId: quest.id }).expect(201);
    const id: string = accepted.body.id;
    await ctx.http().patch(`/assignments/${id}/advance`).set(bearer(employeeToken)).expect(200);
    await ctx.http().post('/submissions').set(bearer(employeeToken)).field('assignmentId', id).expect(201);

    const xpBefore = (await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } })).totalXp;
    const rejected = await ctx
      .http()
      .post(`/assignments/${id}/reject`)
      .set(bearer(managerToken))
      .send({ note: 'Please add the course code.' })
      .expect(201);
    expect(rejected.body.state).toBe('accepted');
    expect(rejected.body.rejectionNote).toBe('Please add the course code.');
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } })).totalXp).toBe(xpBefore);

    // Resubmit and approve.
    await ctx.http().post('/submissions').set(bearer(employeeToken)).field('assignmentId', id).expect(201);
    await ctx.http().post(`/assignments/${id}/approve`).set(bearer(managerToken)).expect(201);
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.employee.id } })).totalXp).toBe(xpBefore + 40);
  });

  it('an expired quest cannot be accepted', async () => {
    const quest = await createQuest(ctx.prisma, {
      createdById: team.manager.id,
      departmentId: team.dept.id,
      dueAt: new Date(Date.now() - 60_000),
    });
    await ctx.http().post('/assignments').set(bearer(employeeToken)).send({ questId: quest.id }).expect(400);
  });

  it('an employee cannot work on or submit a colleague\'s assignment', async () => {
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id });
    const colleagueToken = await login(ctx, team.colleague.email);
    const theirs = await ctx.http().post('/assignments').set(bearer(colleagueToken)).send({ questId: quest.id }).expect(201);

    await ctx.http().patch(`/assignments/${theirs.body.id}/advance`).set(bearer(employeeToken)).expect(404);
    await ctx.http().post('/submissions').set(bearer(employeeToken)).field('assignmentId', theirs.body.id).expect(404);
  });

  it('accepting the first quest earns an automatic badge', async () => {
    await ctx.prisma.badge.create({
      data: {
        nameEn: 'First Step',
        nameAr: 'الخطوة الأولى',
        descriptionEn: 'Accept your first quest',
        descriptionAr: 'اقبل أول مهمة',
        howToEn: 'Accept any quest',
        howToAr: 'اقبل أي مهمة',
        groupEn: 'Getting started',
        groupAr: 'البداية',
        icon: 'flag',
        tier: 'bronze',
        criteria: { type: 'questsAccepted', count: 1 },
      },
    });
    const newcomer = await ctx.prisma.user.findUniqueOrThrow({ where: { id: team.colleague.id } });
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id });
    const token = await login(ctx, newcomer.email);

    await ctx.http().post('/assignments').set(bearer(token)).send({ questId: quest.id }).expect(201);

    expect(await ctx.prisma.userBadge.count({ where: { userId: newcomer.id } })).toBe(1);
    expect(await ctx.prisma.notification.count({ where: { userId: newcomer.id, kind: 'badge' } })).toBe(1);
  });
});
