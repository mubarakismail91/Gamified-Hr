/**
 * Load test (item 8, NFR5: 95% of staff online at once). Simulates USERS employees against the
 * production build started with `npm run load:server`.
 *
 *   Spike:  every user signs in at a random moment within RAMP_S seconds, loads the dashboard,
 *           and opens a live (Socket.IO) connection.
 *   Steady: until STEADY_S seconds after the spike, each user opens a page every 30–60 s
 *           (all of that page's API calls at once, like the browser), and 5% of page views also
 *           send Kudos to a department colleague, whose live notification delay is measured.
 *
 *   npm run load:run -- --label=baseline        (USERS=2850 RAMP_S=60 STEADY_S=240 by default)
 *
 * Writes a Markdown summary to loadtest/results/ (and the raw numbers as JSON, git-ignored).
 */
import { writeFileSync } from 'fs';
import { cpus, totalmem } from 'os';
import { join } from 'path';
import { io, type Socket } from 'socket.io-client';
import { LOAD_PASSWORD, LOAD_PORT } from './setup';

const TARGET = process.env.TARGET ?? `http://localhost:${LOAD_PORT}`;
const USERS = Number(process.env.USERS ?? 2850);
const DEPARTMENTS = 30;
const RAMP_S = Number(process.env.RAMP_S ?? 60);
const STEADY_S = Number(process.env.STEADY_S ?? 240);
const WRITE_RATE = 0.05;
const LABEL = process.argv.find((a) => a.startsWith('--label='))?.slice(8) ?? 'run';

type Phase = 'spike' | 'steady';
const samples = new Map<string, { phase: Phase; ms: number; ok: boolean }[]>();
const errors = new Map<string, number>();
const sockets = { connected: 0, failed: 0, connectMs: [] as number[] };
const liveDelays: number[] = [];
let generatorLagMax = 0;
const t0 = Date.now();
const phase = (): Phase => (Date.now() - t0 < RAMP_S * 1000 ? 'spike' : 'steady');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const record = (name: string, ms: number, ok: boolean, p = phase()) => {
  if (!samples.has(name)) samples.set(name, []);
  samples.get(name)!.push({ phase: p, ms, ok });
};

async function call(name: string, method: string, path: string, token?: string, body?: unknown): Promise<{ ok: boolean; json?: unknown }> {
  const started = performance.now();
  try {
    const res = await fetch(TARGET + path, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    const ok = res.status < 400;
    record(name, performance.now() - started, ok);
    if (!ok) errors.set(`${name} -> ${res.status}`, (errors.get(`${name} -> ${res.status}`) ?? 0) + 1);
    return { ok, json: ok && text ? JSON.parse(text) : undefined };
  } catch (err) {
    record(name, performance.now() - started, false);
    const key = `${name} -> ${(err as Error).name}`;
    errors.set(key, (errors.get(key) ?? 0) + 1);
    return { ok: false };
  }
}

/** What each page asks the API for (mirrors the frontend's queries). */
const PAGES: Record<string, string[]> = {
  dashboard: ['/assignments/mine', '/quests', '/leaderboard?period=week&metric=points&scope=dept', '/badges/mine', '/activity/mine', '/notifications/mine'],
  quests: ['/quests', '/assignments/mine', '/notifications/mine'],
  leaderboard: ['/leaderboard?period=week&metric=points&scope=dept', '/badges', '/squads/leaderboard?period=week', '/notifications/mine'],
  kudos: ['/kudos', '/notifications/mine'],
  badges: ['/badges/mine', '/notifications/mine'],
  squads: ['/squads/mine', '/squads/challenges', '/notifications/mine'],
  profile: ['/activity/mine', '/badges/mine', '/notifications/mine'],
};
const MIX: [string, number][] = [['dashboard', 30], ['quests', 20], ['leaderboard', 15], ['kudos', 15], ['badges', 10], ['squads', 5], ['profile', 5]];
const choosePage = () => {
  let r = Math.random() * 100;
  for (const [p, w] of MIX) if ((r -= w) < 0) return p;
  return 'dashboard';
};

async function page(name: string, token: string) {
  const started = performance.now();
  const results = await Promise.all(PAGES[name].map((path) => call(`GET ${path.split('?')[0]}`, 'GET', path, token)));
  record(`page: ${name}`, performance.now() - started, results.every((r) => r.ok));
}

async function virtualUser(i: number, endAt: number) {
  await sleep(Math.random() * RAMP_S * 1000);
  const login = await call('POST /auth/login', 'POST', '/auth/login', undefined, { email: `employee${i}@load.test`, password: LOAD_PASSWORD });
  const token = (login.json as { accessToken?: string } | undefined)?.accessToken;
  if (!token) return;
  await page('dashboard', token);

  const s: Socket = io(TARGET, { auth: { token }, transports: ['websocket'], reconnection: false, timeout: 20_000 });
  const connectStarted = performance.now();
  s.once('connect', () => {
    sockets.connected += 1;
    sockets.connectMs.push(performance.now() - connectStarted);
  });
  s.once('connect_error', () => (sockets.failed += 1));
  s.on('notification', (e: { createdAt: string }) => liveDelays.push(Date.now() - Date.parse(e.createdAt)));

  while (Date.now() < endAt) {
    await sleep(30_000 + Math.random() * 30_000);
    if (Date.now() >= endAt) break;
    await page(choosePage(), token);
    if (Math.random() < WRITE_RATE) {
      const colleague = (i + DEPARTMENTS * (1 + Math.floor(Math.random() * 10))) % USERS; // same department
      await call('POST /kudos', 'POST', '/kudos', token, { toUserId: `lu_employee_${colleague}`, value: 'service', message: 'Thank you for your help today.' });
    }
  }
  s.disconnect();
}

const pct = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};
const f = (n: number) => (Number.isNaN(n) ? '–' : n < 10 ? n.toFixed(1) : String(Math.round(n)));

async function main() {
  const lagTimer = setInterval(() => {
    const expected = Date.now();
    setImmediate(() => (generatorLagMax = Math.max(generatorLagMax, Date.now() - expected)));
  }, 500);
  const endAt = t0 + (RAMP_S + STEADY_S) * 1000;
  console.log(`Load test "${LABEL}": ${USERS} users, ${RAMP_S}s sign-in spike, then ${STEADY_S}s steady use, against ${TARGET}`);
  const progress = setInterval(() => {
    const n = [...samples.values()].reduce((a, v) => a + v.length, 0);
    console.log(`  t+${Math.round((Date.now() - t0) / 1000)}s  requests=${n}  live connections=${sockets.connected}  errors=${[...errors.values()].reduce((a, b) => a + b, 0)}`);
  }, 30_000);
  await Promise.all(Array.from({ length: USERS }, (_, i) => virtualUser(i, endAt)));
  clearInterval(progress);
  clearInterval(lagTimer);

  const rows = [...samples.entries()].sort(([a], [b]) => (a.startsWith('page') === b.startsWith('page') ? a.localeCompare(b) : a.startsWith('page') ? -1 : 1));
  const line = (name: string, xs: { ms: number; ok: boolean }[]) => {
    const ms = xs.map((x) => x.ms);
    const failed = xs.filter((x) => !x.ok).length;
    return `| ${name} | ${xs.length} | ${f(pct(ms, 50))} | ${f(pct(ms, 95))} | ${f(pct(ms, 99))} | ${f(Math.max(...ms))} | ${failed} |`;
  };
  const table = (p: Phase) =>
    ['| Request | Count | p50 ms | p95 ms | p99 ms | max ms | failed |', '| --- | --- | --- | --- | --- | --- | --- |']
      .concat(rows.map(([n, xs]) => [n, xs.filter((x) => x.phase === p)] as const).filter(([, xs]) => xs.length).map(([n, xs]) => line(n, xs)))
      .join('\n');

  const all = [...samples.values()].flat();
  const steady = all.filter((x) => x.phase === 'steady');
  const pages = rows.filter(([n]) => n.startsWith('page')).flatMap(([, xs]) => xs);
  const pageP95 = pct(pages.map((x) => x.ms), 95);
  const failedTotal = all.filter((x) => !x.ok).length;
  const verdict = (pass: boolean) => (pass ? 'PASS' : 'FAIL');
  const machine = `${cpus()[0].model} (${cpus().length} cores), ${Math.round(totalmem() / 2 ** 30)} GB RAM`;

  const md = `# Load test: ${LABEL}

${new Date().toISOString()} · ${USERS} simulated employees (95% of 3,000 staff) · ${RAMP_S} s sign-in spike + ${STEADY_S} s steady use
Machine: ${machine}. API (production build, one Node process), PostgreSQL and the load generator all ran on this one machine.

## Verdict

| Check | Target | Result | |
| --- | --- | --- | --- |
| Users signed in and connected live | ${USERS} | ${sockets.connected} (${sockets.failed} failed) | ${verdict(sockets.connected === USERS)} |
| Failed requests | 0 | ${failedTotal} of ${all.length} | ${verdict(failedTotal === 0)} |
| Page load p95 (all of a page's API calls) | < 1000 ms | ${f(pageP95)} ms | ${verdict(pageP95 < 1000)} |
| Live notification delay p95 | < 1000 ms | ${f(pct(liveDelays, 95))} ms (${liveDelays.length} delivered) | ${verdict(pct(liveDelays, 95) < 1000)} |

Steady-state throughput: ${(steady.length / STEADY_S).toFixed(1)} requests/s. Load-generator event-loop lag (max): ${generatorLagMax} ms${generatorLagMax > 200 ? ' — high: the generator itself may have added delay' : ''}.

## Sign-in spike (first ${RAMP_S} s)

${table('spike')}

## Steady use

${table('steady')}

## Errors

${errors.size ? [...errors.entries()].map(([k, v]) => `- ${k}: ${v}`).join('\n') : 'None.'}
`;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(join(__dirname, 'results', `${LABEL}.md`), md);
  writeFileSync(join(__dirname, 'results', `${LABEL}-${stamp}.json`), JSON.stringify({ samples: Object.fromEntries(samples), liveDelays, sockets, errors: Object.fromEntries(errors) }));
  console.log(md);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
