import { bearer, createDepartment, createQuest, createTestApp, login, resetDatabase, type TestContext } from './support/app';

/** Item 12: files stored in PostgreSQL (free hosts wipe the disk), the health check, cookie settings. */
describe('Deployment readiness (API)', () => {
  let ctx: TestContext;
  let team: Awaited<ReturnType<typeof createDepartment>>;
  let managerToken: string;
  let employeeToken: string;

  const binary = (res: import('superagent').Response, cb: (err: Error | null, body: Buffer) => void) => {
    const chunks: Buffer[] = [];
    res.on('data', (c: Buffer) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  };

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    team = await createDepartment(ctx.prisma, 'Research');
    managerToken = await login(ctx, team.manager.email);
    employeeToken = await login(ctx, team.employee.email);
  });
  afterAll(() => ctx.app.close());

  it('/health answers without a token and checks the database', async () => {
    const res = await ctx.http().get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('a submitted file is stored in the database and downloads byte for byte, with an Arabic name', async () => {
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id });
    const accepted = await ctx.http().post('/assignments').set(bearer(employeeToken)).send({ questId: quest.id }).expect(201);
    await ctx.http().patch(`/assignments/${accepted.body.id}/advance`).set(bearer(employeeToken)).expect(200);

    const content = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x10, 0x80, 0x7f]); // includes non-UTF-8 bytes
    const fileName = 'تقرير الأسبوع.pdf';
    const submitted = await ctx
      .http()
      .post('/submissions')
      .set(bearer(employeeToken))
      .field('assignmentId', accepted.body.id)
      .attach('file', content, { filename: fileName, contentType: 'application/pdf' })
      .expect(201);

    const row = await ctx.prisma.questSubmission.findUniqueOrThrow({ where: { id: submitted.body.id } });
    expect(row.fileId).not.toBeNull();
    const stored = await ctx.prisma.storedFile.findUniqueOrThrow({ where: { id: row.fileId as string } });
    expect(Buffer.from(stored.data).equals(content)).toBe(true);

    const download = await ctx.http().get(`/submissions/${row.id}/file`).set(bearer(managerToken)).buffer(true).parse(binary).expect(200);
    expect((download.body as Buffer).equals(content)).toBe(true);
    expect(download.headers['content-type']).toMatch(/application\/pdf/);
    expect(download.headers['content-disposition']).toContain(`filename*=UTF-8''${encodeURIComponent(fileName)}`);
  });

  it('quest attachments are stored in the database, and removing them leaves no orphaned files', async () => {
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id, title: 'With brief' });
    const res = await ctx
      .http()
      .post(`/quests/${quest.id}/attachments`)
      .set(bearer(managerToken))
      .attach('file', Buffer.from('brief contents'), { filename: 'brief.txt', contentType: 'text/plain' })
      .expect(201);
    const attachmentId = res.body.attachments[0].id as string;

    const dl = await ctx.http().get(`/quests/${quest.id}/attachments/${attachmentId}/file`).set(bearer(employeeToken)).buffer(true).parse(binary).expect(200);
    expect((dl.body as Buffer).toString()).toBe('brief contents');

    const before = await ctx.prisma.storedFile.count();
    await ctx.http().delete(`/quests/${quest.id}/attachments/${attachmentId}`).set(bearer(managerToken)).expect(200);
    expect(await ctx.prisma.storedFile.count()).toBe(before - 1);
    expect(await ctx.prisma.questAttachment.count({ where: { questId: quest.id } })).toBe(0);
  });

  it('deleting a quest also deletes its stored files', async () => {
    const quest = await createQuest(ctx.prisma, { createdById: team.manager.id, departmentId: team.dept.id, title: 'To delete' });
    await ctx
      .http()
      .post(`/quests/${quest.id}/attachments`)
      .set(bearer(managerToken))
      .attach('file', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' })
      .expect(201);
    const before = await ctx.prisma.storedFile.count();
    await ctx.http().delete(`/quests/${quest.id}`).set(bearer(managerToken)).expect(200);
    expect(await ctx.prisma.storedFile.count()).toBe(before - 1);
  });

  it('the refresh cookie path and SameSite follow COOKIE_PATH / COOKIE_SAME_SITE (for the /api proxy)', async () => {
    process.env.COOKIE_PATH = '/api/auth';
    process.env.COOKIE_SAME_SITE = 'lax';
    try {
      const res = await ctx.http().post('/auth/login').send({ email: team.colleague.email, password: 'Test-password-1' }).expect(200);
      const cookie = String(res.headers['set-cookie']);
      expect(cookie).toMatch(/Path=\/api\/auth/);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/HttpOnly/i);
    } finally {
      delete process.env.COOKIE_PATH;
      delete process.env.COOKIE_SAME_SITE;
    }
  });
});
