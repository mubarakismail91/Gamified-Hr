import { Injectable } from '@nestjs/common';
import type { Prisma, XpSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GENESIS_HASH, hashOf } from './xp-hash';

export interface XpEntry {
  userId: string;
  amount: number;
  source: XpSource;
  refType?: string;
  refId?: string;
  /** One key per real-world event, e.g. "quest:<assignmentId>". Repeating it never awards twice. */
  idempotencyKey: string;
  actorId?: string | null;
  /** For deductions: never take the balance below 0, and record only what was actually taken. */
  clampAtZero?: boolean;
}

export interface XpResult {
  /** The amount actually recorded (may be less than asked when clamped; 0 = nothing recorded). */
  applied: number;
  balance: number;
  /** True when this idempotency key was already recorded: nothing new happened. */
  duplicate: boolean;
}

export interface LedgerProblem {
  userId: string;
  name: string;
  seq?: number;
  issue: string;
}

/**
 * The only way XP changes (item 11). Each call runs inside the caller's transaction and:
 *  1. takes a per-person lock (pg_advisory_xact_lock), so one person's rows are appended one at a time;
 *  2. returns the earlier result if the idempotency key was already used;
 *  3. appends a row chained to the previous one by hash, and sets User.totalXp to the new balance.
 * Different people are never blocked by each other.
 */
@Injectable()
export class XpLedgerService {
  constructor(private prisma: PrismaService) {}

  async record(tx: Prisma.TransactionClient, e: XpEntry): Promise<XpResult> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${e.userId}))`;

    const existing = await tx.xpTransaction.findUnique({ where: { idempotencyKey: e.idempotencyKey } });
    if (existing) return { applied: existing.amount, balance: existing.balanceAfter, duplicate: true };

    const last = await tx.xpTransaction.findFirst({ where: { userId: e.userId }, orderBy: { seq: 'desc' } });
    const balance = last?.balanceAfter ?? 0;
    const applied = e.clampAtZero ? Math.max(e.amount, -balance) : e.amount;
    if (applied === 0) return { applied: 0, balance, duplicate: false };

    const row = {
      userId: e.userId,
      seq: (last?.seq ?? 0) + 1,
      amount: applied,
      balanceAfter: balance + applied,
      source: e.source,
      refType: e.refType ?? null,
      refId: e.refId ?? null,
      idempotencyKey: e.idempotencyKey,
      actorId: e.actorId ?? null,
      prevHash: last?.hash ?? GENESIS_HASH,
      createdAt: new Date(),
    };
    await tx.xpTransaction.create({ data: { ...row, hash: hashOf(row) } });
    await tx.user.update({ where: { id: e.userId }, data: { totalXp: row.balanceAfter } });
    return { applied, balance: row.balanceAfter, duplicate: false };
  }

  /** A person's ledger, oldest first (for dispute resolution). */
  async history(userId: string) {
    return this.prisma.xpTransaction.findMany({ where: { userId }, orderBy: { seq: 'asc' } });
  }

  /**
   * Re-checks every chain: sequence numbers, links, hashes and running balances, and that each
   * person's cached totalXp and activity-feed XP agree with their ledger. Reports what's wrong.
   */
  async verify(): Promise<{ ok: boolean; checkedUsers: number; checkedRows: number; problems: LedgerProblem[] }> {
    const users = await this.prisma.user.findMany({ select: { id: true, nameEn: true, totalXp: true } });
    const feed = await this.prisma.activityLog.groupBy({ by: ['userId'], _sum: { xpDelta: true } });
    const feedSum = new Map(feed.map((f) => [f.userId, f._sum.xpDelta ?? 0]));
    const problems: LedgerProblem[] = [];
    let checkedRows = 0;

    for (const u of users) {
      const rows = await this.history(u.id);
      checkedRows += rows.length;
      let prev = GENESIS_HASH;
      let balance = 0;
      const report = (issue: string, seq?: number) => problems.push({ userId: u.id, name: u.nameEn, seq, issue });

      rows.forEach((r, i) => {
        if (r.seq !== i + 1) report(`row ${i + 1} is missing or out of order (found seq ${r.seq})`, r.seq);
        if (r.prevHash !== prev) report('link to the previous row is broken', r.seq);
        balance += r.amount;
        if (r.balanceAfter !== balance) report(`running balance is ${r.balanceAfter}, expected ${balance}`, r.seq);
        if (hashOf(r) !== r.hash) report('row contents do not match its hash (edited after it was written)', r.seq);
        prev = r.hash;
      });
      if (u.totalXp !== balance) report(`cached total is ${u.totalXp} but the ledger adds up to ${balance}`);
      const fed = feedSum.get(u.id) ?? 0;
      if (fed !== balance) report(`activity feed shows ${fed} XP but the ledger adds up to ${balance}`);
    }
    return { ok: problems.length === 0, checkedUsers: users.length, checkedRows, problems: problems.slice(0, 100) };
  }
}
