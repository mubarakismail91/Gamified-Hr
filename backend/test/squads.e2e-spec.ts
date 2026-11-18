import { bearer, createDepartment, createTestApp, createUser, login, resetDatabase, type TestContext } from './support/app';

type Person = { id: string; email: string; token: string };

/** Item 7 (FR9): squads, the team leaderboard and cross-department squad challenges. */
describe('Squads (API)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let research: Awaited<ReturnType<typeof createDepartment>>;
  let finance: Awaited<ReturnType<typeof createDepartment>>;
  let managerToken: string;

  const employee = async (departmentId: string): Promise<Person> => {
    const u = await createUser(ctx.prisma, 'employee', { departmentId });
    return { id: u.id, email: u.email, token: await login(ctx, u.email) };
  };
  const award = (userId: string, amount: number) =>
    ctx.http().post(`/users/${userId}/award-xp`).set(bearer(adminToken)).send({ amount, reason: 'test' }).expect(201);
  const xpOf = async (id: string) => (await ctx.prisma.user.findUniqueOrThrow({ where: { id } })).totalXp;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);
    research = await createDepartment(ctx.prisma, 'Research');
    finance = await createDepartment(ctx.prisma, 'Finance');
    managerToken = await login(ctx, research.manager.email);
  });

  afterAll(() => ctx.app.close());

  describe('employee-led squads (invite and accept)', () => {
    let lead: Person, a: Person, b: Person;
    let squadId: string;

    beforeAll(async () => {
      lead = await employee(research.dept.id);
      a = await employee(finance.dept.id); // cross-department
      b = await employee(research.dept.id);
    });

    it('creating a squad makes you its first member and INVITES the others', async () => {
      const res = await ctx.http().post('/squads').set(bearer(lead.token)).send({ name: 'Bridge Builders', memberIds: [a.id, b.id] }).expect(201);
      squadId = res.body.id;
      const status = Object.fromEntries(res.body.members.map((m: { user: { id: string }; status: string }) => [m.user.id, m.status]));
      expect(status).toEqual({ [lead.id]: 'active', [a.id]: 'invited', [b.id]: 'invited' });
      expect(res.body).toMatchObject({ activeCount: 1, ranked: false, canManage: true });
      expect(await ctx.prisma.notification.count({ where: { userId: a.id, titleEn: 'Squad invitation' } })).toBe(1);
    });

    it('an invitee accepts or declines; accepting notifies the creator', async () => {
      const mine = await ctx.http().get('/squads/mine').set(bearer(a.token)).expect(200);
      expect(mine.body.squad).toBeNull();
      expect(mine.body.invites.map((s: { id: string }) => s.id)).toEqual([squadId]);

      const accepted = await ctx.http().post(`/squads/${squadId}/invite/accept`).set(bearer(a.token)).expect(201);
      expect(accepted.body.squad.id).toBe(squadId);
      await ctx.http().post(`/squads/${squadId}/invite/decline`).set(bearer(b.token)).expect(201);
      expect(await ctx.prisma.squadMember.count({ where: { squadId } })).toBe(2);
      expect(await ctx.prisma.notification.count({ where: { userId: lead.id, titleEn: 'Squad invitation accepted' } })).toBe(1);
    });

    it('you can only be ACTIVE in one squad at a time', async () => {
      await ctx.http().post('/squads').set(bearer(a.token)).send({ name: 'Second Squad' }).expect(400);

      // Two invites to someone free; after accepting one, the database refuses the other.
      const c = await employee(finance.dept.id);
      const other1 = await employee(finance.dept.id);
      const other2 = await employee(finance.dept.id);
      const s1 = await ctx.http().post('/squads').set(bearer(other1.token)).send({ name: 'Squad One', memberIds: [c.id] }).expect(201);
      const s2 = await ctx.http().post('/squads').set(bearer(other2.token)).send({ name: 'Squad Two', memberIds: [c.id] }).expect(201);
      await ctx.http().post(`/squads/${s1.body.id}/invite/accept`).set(bearer(c.token)).expect(201);
      await ctx.http().post(`/squads/${s2.body.id}/invite/accept`).set(bearer(c.token)).expect(400);
    });

    it('only the creator can add or remove others; anyone can leave', async () => {
      await ctx.http().post(`/squads/${squadId}/members`).set(bearer(a.token)).send({ userId: b.id }).expect(403);
      await ctx.http().delete(`/squads/${squadId}/members/${lead.id}`).set(bearer(a.token)).expect(403);
      const left = await ctx.http().delete(`/squads/${squadId}/members/${a.id}`).set(bearer(a.token)).expect(200);
      expect(left.body).toEqual({ disbanded: false });
    });

    it('an employee-led squad disappears when its last member leaves', async () => {
      const left = await ctx.http().delete(`/squads/${squadId}/members/${lead.id}`).set(bearer(lead.token)).expect(200);
      expect(left.body).toEqual({ disbanded: true });
      expect(await ctx.prisma.squad.findUnique({ where: { id: squadId } })).toBeNull();
    });
  });

  describe('manager- and admin-assigned squads', () => {
    it('a manager adds own-department employees directly (no invite), and is notified to each', async () => {
      const x = await employee(research.dept.id);
      const y = await employee(research.dept.id);
      const res = await ctx.http().post('/squads').set(bearer(managerToken)).send({ name: 'Lab Team', memberIds: [x.id, y.id] }).expect(201);
      expect(res.body.members.every((m: { status: string }) => m.status === 'active')).toBe(true);
      expect(res.body.members).toHaveLength(2); // the manager isn't a member
      expect(await ctx.prisma.notification.count({ where: { userId: x.id, titleEn: 'Added to a squad' } })).toBe(1);
    });

    it("a manager can't add someone from another department; an admin can", async () => {
      const outsider = await employee(finance.dept.id);
      await ctx.http().post('/squads').set(bearer(managerToken)).send({ name: 'Nope', memberIds: [outsider.id] }).expect(403);
      await ctx.http().post('/squads').set(bearer(adminToken)).send({ name: 'Cross Team', memberIds: [outsider.id] }).expect(201);
    });

    it('a squad holds at most 6 people', async () => {
      const people = await Promise.all(Array.from({ length: 7 }, () => employee(finance.dept.id)));
      await ctx.http().post('/squads').set(bearer(adminToken)).send({ name: 'Too Big', memberIds: people.map((p) => p.id) }).expect(400);
      const ok = await ctx.http().post('/squads').set(bearer(adminToken)).send({ name: 'Full', memberIds: people.slice(0, 6).map((p) => p.id) }).expect(201);
      await ctx.http().post(`/squads/${ok.body.id}/members`).set(bearer(adminToken)).send({ userId: people[6].id }).expect(400);
    });

    it('only staff can list all squads; managers and admins cannot use the employee "mine" view', async () => {
      await ctx.http().get('/squads').set(bearer(adminToken)).expect(200);
      await ctx.http().get('/squads/mine').set(bearer(managerToken)).expect(403);
    });
  });

  describe('team leaderboard', () => {
    it('ranks squads of 3+ by AVERAGE XP per member, so a smaller squad can win', async () => {
      await resetDatabase(ctx.prisma);
      adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);
      research = await createDepartment(ctx.prisma, 'Research');
      const small = await Promise.all(Array.from({ length: 3 }, () => employee(research.dept.id)));
      const big = await Promise.all(Array.from({ length: 4 }, () => employee(research.dept.id)));
      const pair = await Promise.all(Array.from({ length: 2 }, () => employee(research.dept.id)));
      await ctx.http().post('/squads').set(bearer(adminToken)).send({ name: 'Small', memberIds: small.map((p) => p.id) }).expect(201);
      await ctx.http().post('/squads').set(bearer(adminToken)).send({ name: 'Big', memberIds: big.map((p) => p.id) }).expect(201);
      await ctx.http().post('/squads').set(bearer(adminToken)).send({ name: 'Pair', memberIds: pair.map((p) => p.id) }).expect(201);

      for (const p of small) await award(p.id, 30); // total 90, average 30
      for (const p of big) await award(p.id, 25); // total 100, average 25
      for (const p of pair) await award(p.id, 500); // only 2 members: not ranked

      const res = await ctx.http().get('/squads/leaderboard?period=week').set(bearer(small[0].token)).expect(200);
      expect(res.body.map((r: { name: string; avgXp: number; totalXp: number; isMine: boolean }) => [r.name, r.avgXp, r.totalXp, r.isMine])).toEqual([
        ['Small', 30, 90, true],
        ['Big', 25, 100, false],
      ]);
      await ctx.http().get('/squads/leaderboard?period=year').set(bearer(adminToken)).expect(400);
    });
  });

  describe('squad challenges', () => {
    let members: Person[];
    let challengeId: string;

    beforeAll(async () => {
      await resetDatabase(ctx.prisma);
      adminToken = await login(ctx, (await createUser(ctx.prisma, 'admin')).email);
      research = await createDepartment(ctx.prisma, 'Research');
      finance = await createDepartment(ctx.prisma, 'Finance');
      managerToken = await login(ctx, research.manager.email);
      members = [await employee(research.dept.id), await employee(finance.dept.id)];
      await ctx.http().post('/squads').set(bearer(adminToken)).send({ name: 'Crossers', memberIds: members.map((m) => m.id) }).expect(201);
    });

    it('managers and admins publish challenges; employees cannot', async () => {
      const body = {
        titleEn: 'Earn 100 XP together',
        metric: 'xp_earned',
        target: 100,
        bonusXp: 40,
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      };
      await ctx.http().post('/squads/challenges').set(bearer(members[0].token)).send(body).expect(403);
      await ctx.http().post('/squads/challenges').set(bearer(managerToken)).send({ ...body, endsAt: body.startsAt }).expect(400);
      const res = await ctx.http().post('/squads/challenges').set(bearer(managerToken)).send(body).expect(201);
      challengeId = res.body.id;
      expect(res.body).toMatchObject({ status: 'active', squadsJoined: 0 });
    });

    it('a squad needs 3 active members to take on a challenge', async () => {
      await ctx.http().post(`/squads/challenges/${challengeId}/join`).set(bearer(members[0].token)).expect(400);
      const third = await employee(finance.dept.id);
      const squad = await ctx.prisma.squad.findFirstOrThrow({ where: { name: 'Crossers' } });
      await ctx.http().post(`/squads/${squad.id}/members`).set(bearer(adminToken)).send({ userId: third.id }).expect(201);
      members.push(third);
      const joined = await ctx.http().post(`/squads/challenges/${challengeId}/join`).set(bearer(members[0].token)).expect(201);
      expect(joined.body.mine).toEqual({ joined: true, progress: 0, completedAt: null });
    });

    it('combined progress counts every member; the bonus is paid once, to everyone, when the target is first reached', async () => {
      await award(members[0].id, 60);
      let list = await ctx.http().get('/squads/challenges').set(bearer(members[1].token)).expect(200);
      expect(list.body[0].mine).toMatchObject({ progress: 60, completedAt: null });

      const before = await Promise.all(members.map((m) => xpOf(m.id)));
      // Two awards arrive together and both push the squad past 100: the bonus must still be paid once.
      await Promise.all([award(members[1].id, 30), award(members[2].id, 30)]);
      const after = await Promise.all(members.map((m) => xpOf(m.id)));

      expect(after[0] - before[0]).toBe(40); // bonus only
      expect(after[1] - before[1]).toBe(70); // 30 + bonus
      expect(after[2] - before[2]).toBe(70);
      expect(await ctx.prisma.activityLog.count({ where: { refType: 'SquadChallenge', refId: challengeId } })).toBe(3);

      list = await ctx.http().get('/squads/challenges').set(bearer(members[1].token)).expect(200);
      expect(list.body[0].mine.completedAt).not.toBeNull();
      expect(list.body[0].mine.progress).toBe(120); // the bonus itself doesn't count as progress
      expect(list.body[0]).toMatchObject({ squadsJoined: 1, squadsCompleted: 1 });
      expect(await ctx.prisma.notification.count({ where: { userId: members[0].id, titleEn: '+40 XP: squad challenge completed' } })).toBe(1);

      await award(members[0].id, 50); // more activity later: no second bonus
      expect(await ctx.prisma.activityLog.count({ where: { refType: 'SquadChallenge', refId: challengeId } })).toBe(3);
    });
  });
});
