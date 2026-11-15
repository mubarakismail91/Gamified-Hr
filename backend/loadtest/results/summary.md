# Load test summary (item 8, NFR5) — 15 Nov 2026

2,850 simulated employees (95% of 3,000 staff): 60 s sign-in spike, then 4 min of steady use.
One machine (Apple M2, 8 cores, 8 GB RAM) ran PostgreSQL, the API (production build, one process)
and the load generator. Full tables: `baseline.md` and `after.md`.

| Measure | Target | Baseline | After fixes |
| --- | --- | --- | --- |
| Users signed in and connected live | 2,850 | 484 | 1,199 |
| Requests handled (whole run) | — | 10,037 | 47,406 |
| Steady-state throughput | — | 18 req/s | 154 req/s |
| Failed requests | 0 | 2,366 (all sign-in timeouts) | 5,248 |
| Page load p95 | < 1 s | 0.86 s (few users got in) | 14.7 s |
| Live notification delay p95 | < 1 s | 96 ms | 142 ms |
| Load-generator event-loop lag (max) | low | 187 ms | 1,023 ms |

## What was found and changed

1. **Sign-in rush was CPU-bound on password hashing.** bcrypt cost 12 (~250 ms CPU per check) on
   Node's default 4-thread pool gave ~16 sign-ins/s; the spike needs ~48/s. Changed: thread pool =
   CPU cores; bcrypt cost configurable (`BCRYPT_ROUNDS`, default 10, OWASP minimum).
2. **`/badges/mine` computed every badge's progress twice** (evaluate, then display). Now one pass.
3. **The Kudos feed returned every Kudos ever sent** (6,000 rows), and Profile downloaded it to count.
   Now the latest 50, plus `/kudos/received-count` and `?received=true` for Profile.
4. **Missing indexes** on notifications per user, quest assignments per employee, Kudos by recipient
   and date, submissions per employee.
5. **Database pool** raised from 10 to 20 connections (`DB_POOL_SIZE`).

## Interpretation

The fixes raised capacity (2.5x more people signed in, 8.5x throughput, live notifications still
under 150 ms), but **NFR5 is not met on this setup**: with more users getting in, the single laptop
saturated — the database pool queued long enough that some writes failed to start a transaction
within Prisma's 2 s limit (HTTP 500), and the load generator itself lagged by up to 1 s, so part of
the measured delay is the test client, not the server. These numbers are a lower bound.

## Still to do for NFR5

- Re-run on infrastructure like the pilot's: API on its own server (or 2+ instances behind a load
  balancer), PostgreSQL separate, and the load generator on a third machine.
- With several API instances: in-memory rate limiting and Socket.IO rooms need a shared store
  (Redis) so limits and live notifications work across instances.
- Treat a 60-second all-staff password sign-in as a worst case: most returning users are signed in
  silently by their refresh cookie and never hash a password.
