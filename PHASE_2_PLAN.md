# IU Gamified HR — Phase 2 Plan (Backend & Integration)

Status: **Phase 1 frontend approved 2026-09-11.** This document is the plan for
Phase 2. No backend code is written yet — several decisions (below) need your
sign-off first.

---

## 1. Phase 1 summary (what exists today)

A complete, clickable frontend at the repo root:

- **Stack:** Vite + React 18 + TypeScript + Tailwind, shadcn-style Radix UI,
  react-router, react-i18next, Recharts, sonner.
- **10 screens:** Landing/SSO, Dashboard, Leaderboard, Quests, Badges, Skill Tree,
  Kudos, Profile, Notifications, Admin panel.
- **Cross-cutting:** bilingual EN/AR with full RTL flip, prototype role switcher
  (Employee / Manager / HR / Admin), mobile-responsive, Gregorian + Hijri dates,
  XP / نقاط terminology, dignified visual language sampled from iu.edu.sa.
- **All data is mock** — TypeScript modules in `src/data/`. Every user-facing
  string is shaped `{ en, ar }`.
- **Simulated SSO** — a 3-step visual handshake, no real auth.
- Type-checks (`npm run typecheck`), production-builds (`npm run build`).

What Phase 2 replaces: mock data → real API; fake auth flag → real SSO session;
in-memory quest/kudos/notification state → persisted, server-authoritative state;
static admin numbers → live aggregations; add the SDT survey engine.

---

## 2. Phase 2 objectives

1. Real **SSO** against the IU portal, with just-in-time user provisioning.
2. **Persistent domain data** and a server-authoritative **gamification engine**
   (points, levels, badges, streaks) with a tamper-evident audit trail.
3. **REST API** covering every screen, plus **real-time** push for XP / badges /
   notifications.
4. **Admin/HR functionality** — quest CRUD with per-department visibility,
   engagement analytics, demographics with privacy safeguards, audit view.
5. **SDT survey engine** — quarterly autonomy/competence/relatedness pulse
   surveys with anonymised responses and research export.
6. **Frontend integration** — swap mock data for the API without redesigning UI.
7. **Security, privacy (PDPL), and data-residency** compliance.

---

## 3. Decisions required (with recommendations)

| # | Decision | Options | Recommendation | Why |
|---|---|---|---|---|
| D1 | **SSO protocol** | SAML 2.0 · OAuth2/OIDC | **OIDC (Authorization Code + PKCE)**, with a SAML adapter as fallback | OIDC is JSON-based, simpler libraries, mobile-friendly. Many university portals (esp. Microsoft Entra/ADFS) still speak SAML — so build behind an `IdentityProvider` interface and confirm with IU IT which they expose. |
| D2 | **Backend framework** | NestJS (TS) · Laravel (PHP) · .NET · Django | **NestJS** | Same language as the frontend → shared types, one skill set for a solo developer, strong structure (DI, modules), first-class WebSocket + OpenAPI support. Pick Laravel instead only if you're already fluent in PHP. |
| D3 | **Database** | PostgreSQL · MySQL · SQL Server | **PostgreSQL** | `JSONB` for flexible event/criteria payloads, strong constraints for the points ledger, great tooling. |
| D4 | **ORM / migrations** | Prisma · TypeORM · Drizzle | **Prisma** | TS-first schema, reliable migrations, pairs well with NestJS. |
| D5 | **Session model** | JWT access+refresh · server sessions in Redis · httpOnly cookie session | **httpOnly, SameSite=Lax cookie session** backed by Redis | Web-first app; no token in JS (XSS-safe), simple CSRF story, easy revocation. |
| D6 | **Real-time transport** | Socket.IO · native WebSocket · SSE | **Socket.IO** + Redis adapter | Rooms per user, reconnection handling, and the Redis adapter also covers pub/sub, caching, and rate-limiting. |
| D7 | **Hosting** | University on-prem VM · institutional cloud · public cloud (KSA region) | **Institutional infra in KSA** (on-prem VM or gov cloud) | Data residency for staff PII under PDPL. Docker on a single VM is enough for a graduation project; managed Postgres if available. |
| D8 | **SDT survey engine** | Build in-house · integrate external tool | **Build in-house** | It's central to the thesis contribution and needs a specific anonymity model. |

**Unblock SSO now:** run a local **Keycloak** container as a stand-in IdP for
development so backend work isn't blocked while IU IT provides real metadata and
the attribute mapping.

**Attribute mapping to agree with IU IT** (which claim/assertion carries each):
`employee_id`, `name_en`, `name_ar`, `email`, `department`, `college`,
`employment_type` (academic/administrative), `gender`, `title`, IdP `groups/roles`.

---

## 4. Target architecture

```
                         ┌────────────────────┐
   IU Portal (IdP) ◄─────► Auth module (OIDC / SAML adapter)
                         │                    │
  Browser (React SPA) ◄──► NestJS API ────────► PostgreSQL (Prisma)
        ▲   ▲            │  - REST controllers │
        │   │            │  - Gamification     ├─► Redis (sessions, cache,
        │   └── WebSocket │    rules engine    │        pub/sub, rate limit)
        │      (Socket.IO)│  - Jobs (BullMQ)   │
        │                 │  - Audit / events  │
        └─────────────────┘                    └─► Object store (survey exports)
```

**Monorepo (pnpm workspaces):**

```
apps/
  web/        the Phase 1 frontend (moves here mostly unchanged)
  api/        NestJS backend
packages/
  shared/     TS types, XP/level curve, badge criteria types, i18n key list,
              OpenAPI-generated client types
infra/        docker-compose.dev.yml, migrations, seed scripts
```

`src/lib/xp.ts` and the `{en,ar}` types move into `packages/shared` so the rules
engine and the UI compute levels identically.

---

## 5. Data model (core entities)

Persisted in PostgreSQL. `*_en` / `*_ar` columns (or a small `i18n_text` table)
keep the bilingual shape the frontend already expects.

- **users** — `iu_employee_id`, `name_en/ar`, `email`, `department`, `college`,
  `employment_type`, `gender`, `title`, `role`, `status` (active/disabled),
  `joined_at`, `last_login_at`. Populated by SSO JIT + nightly sync.
- **roles / permissions** — RBAC: `employee`, `manager`, `hr`, `admin`.
- **xp_ledger** *(append-only)* — `user_id`, `delta`, `reason_code`,
  `source_type`, `source_id`, `awarded_by` (nullable = system), `idempotency_key`
  (unique), `metadata jsonb`, `created_at`. **Never updated or deleted** —
  corrections are new negative entries.
- **user_stats** *(derived / materialised)* — `total_xp`, `level`, `streak_days`,
  `points_week`, `points_month`, `updated_at`. Rebuilt from the ledger by a job /
  trigger.
- **badges** — `code`, `name_en/ar`, `description_en/ar`, `how_to_en/ar`, `tier`,
  `criteria jsonb` (declarative rule), `active`.
- **user_badges** — `user_id`, `badge_id`, `progress`, `earned_at`.
- **quests** — `code`, `title_en/ar`, `description_en/ar`, `cadence`, `category`,
  `difficulty`, `xp`, `steps`, `visibility` (`all` | `selected`),
  `visible_departments text[]`, `status` (`draft` | `published`), `due_at`,
  `created_by`, timestamps.
- **user_quests** — `user_id`, `quest_id`, `state`, `steps_done`, `accepted_at`,
  `completed_at`.
- **skills** — `code`, `branch`, `name_en/ar`, `description_en/ar`, `max_level`,
  `prerequisite_codes text[]`.
- **user_skills** — `user_id`, `skill_id`, `level`, `state`, `updated_at`.
- **kudos** — `from_user_id`, `to_user_id`, `value`, `message`, `created_at`,
  `visibility` (feed + recipient's manager).
- **notifications** — `user_id`, `kind`, `title_en/ar`, `body_en/ar`, `link`,
  `read`, `created_at`.
- **leaderboard_snapshots** — `period`, `scope`, `generated_at`, `rows jsonb`
  (ranked list). Previous snapshot gives the rank-change delta.
- **survey_rounds** — `code`, `title_en/ar`, `quarter`, `opens_at`, `closes_at`,
  `status`, `target_count`.
- **survey_questions** — `round_id` (or template), `scale`
  (`autonomy` | `competence` | `relatedness`), `text_en/ar`, `order`.
- **survey_responses** — `round_id`, `answers jsonb`, `submitted_at`.
  **No `user_id`.** Anonymity by construction.
- **survey_participation** — `round_id`, `user_id`, `completed` bool. Tracks *who*
  finished (for reminders / nudge XP) without linking to *what* they answered.
- **audit_log** — `actor_id`, `actor_label`, `action`, `target_type`,
  `target_id`, `target_label`, `ip`, `metadata jsonb`, `created_at`. Append-only;
  optional periodic hash-chaining for tamper evidence.
- **domain_events** — raw event stream feeding real-time + analytics + the rules
  engine (`event_type`, `payload jsonb`, `created_at`).

---

## 6. API surface (REST, versioned `/api/v1`)

**Auth**
- `GET  /auth/login` → redirect to IdP
- `GET  /auth/callback` → validate, provision, create session
- `POST /auth/logout`
- `GET  /auth/session` → current user + effective role (replaces the frontend's fake flag)

**Me**
- `GET  /me` — profile + `user_stats`
- `GET  /me/activity`
- `GET  /me/badges`
- `GET  /me/skills`
- `GET  /me/notifications` · `POST /me/notifications/:id/read` · `POST /me/notifications/read-all`

**Engagement**
- `GET  /leaderboard?period=&scope=&metric=`
- `GET  /quests` · `POST /quests/:id/accept` · `POST /quests/:id/progress`
- `GET  /badges`
- `GET  /skills`
- `GET  /kudos` · `POST /kudos`

**Surveys**
- `GET  /surveys/active`
- `POST /surveys/:id/responses` (anonymous; marks `survey_participation` via session, separately)

**Admin** (role-gated: `manager` / `hr` / `admin`)
- `GET  /admin/analytics` — KPIs, participation trend, XP by department, badge distribution
- `GET  /admin/demographics` — with **k-anonymity suppression** (hide any cell < 5)
- `GET  /admin/audit`
- `GET/POST/PATCH /admin/surveys`
- `POST /admin/quests` · `PATCH /admin/quests/:id` · `DELETE /admin/quests/:id`
- `POST /admin/xp-adjustments` (always writes an `xp_ledger` + `audit_log` row)

**Real-time** — Socket.IO namespace `/realtime`, authenticated by the session
cookie, room per `user_id`. Server-emitted events:
`xp.awarded`, `level.up`, `badge.earned`, `notification.new`, `kudos.received`,
`quest.progress`.

Generate an **OpenAPI** spec from NestJS decorators; the frontend consumes
generated client types from `packages/shared`.

---

## 7. Gamification engine

- **Event-driven.** Domain actions emit events (`quest.completed`,
  `kudos.received`, `course.logged`, `daily.login`, …).
- **Rules** (`event_type → conditions → xp delta + badge checks`) live in config
  or a `rules` table, evaluated by a single service. Level is derived from
  `total_xp` via the shared `RANKS` curve.
- **Integrity**
  - Every award carries an `idempotency_key`; the unique constraint on
    `xp_ledger` blocks double-awards.
  - Per-`reason_code` rate limits and daily caps (Redis).
  - Kudos: minimum message length, sender cooldown, reduced weight for rapid
    reciprocal exchanges, optional manager review for outliers.
  - Admin adjustments are never silent — ledger + audit entry, attributed.
- **Jobs (BullMQ on Redis):** nightly streak recompute, leaderboard snapshot,
  `user_stats` refresh, survey reminders, IdP user sync.

---

## 8. SDT survey engine

- HR creates a **round** (questions per SDT sub-scale, open/close dates).
- Eligible staff see a prompt (`GET /surveys/active`); completing it awards a
  small fixed "participation" XP via `survey_participation` — **decoupled from the
  answer payload**.
- `survey_responses` stores answers with **no identity column**. Reminders and the
  participation nudge use `survey_participation` only.
- Analytics: sub-scale means over time, and demographic breakdowns **only where
  every cell has ≥ 5 respondents** (k-anonymity); otherwise the slice is
  suppressed in the API response.
- Export: CSV/Parquet to the object store for the thesis analysis.

---

## 9. Frontend integration (apps/web changes)

- Add `src/api/` — a typed client (fetch wrapper) + **TanStack Query** hooks
  (`useDashboard()`, `useLeaderboard(filters)`, `useQuests()`, …).
- Replace `src/data/*` imports screen-by-screen. Keep the mock modules as **MSW
  handlers** for local dev, Storybook, and tests — contract stays honest because
  both sides import types from `packages/shared`.
- Auth guard calls `GET /auth/session` instead of the `sessionStorage` flag; the
  role switcher becomes dev-only (hidden unless `VITE_ENABLE_ROLE_SWITCHER`).
- Wire the Socket.IO client → push into the existing `NotificationsContext` and
  invalidate the relevant queries.
- Add proper loading / empty / error states (several are already stubbed).
- `VITE_API_BASE_URL` env; CORS on the API locked to the SPA origin.

No visual redesign — the `{en,ar}` response shape matches what components already
consume.

---

## 10. Security, privacy, compliance

- **PDPL (Saudi Personal Data Protection Law):** documented lawful basis, data
  minimisation, retention schedule, and a subject-access path.
- **RBAC server-side** on every endpoint — role from the session, never trusted
  from the client.
- Cookie auth: `httpOnly` + `Secure` + `SameSite=Lax`, CSRF token for mutations,
  `helmet` security headers, strict CORS.
- Input validation with `class-validator` / `zod` DTOs; parameterised queries via
  Prisma.
- Rate limiting (global + per-`reason_code`).
- **Audit log append-only**; optional hash-chaining for tamper evidence.
- **Survey anonymity** enforced in code (no identity column) and in analytics
  (k-anonymity suppression).
- Secrets via environment / a vault, never in the repo. TLS everywhere.
- Data hosted in KSA (see D7).

---

## 11. Testing

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest / Jest | rules engine, XP curve, k-anonymity, selectors |
| Integration | Jest + Testcontainers (Postgres) | API + DB, auth, RBAC |
| E2E | Playwright | golden paths on a seeded DB, both languages |
| Contract | shared types + OpenAPI | mock (MSW) ↔ real API stay aligned |

---

## 12. DevOps

- `docker-compose.dev.yml`: `postgres`, `redis`, `keycloak` (dev IdP), `api`,
  `web`.
- CI: typecheck → lint → unit → integration → build (both apps).
- Deploy: Docker on the institutional VM; run Prisma migrations on release;
  nightly Postgres backup; `/health` + `/ready` endpoints; structured JSON logs.

---

## 13. Milestones (solo developer, ~10 weeks — adjust to your calendar)

| M | Weeks | Deliverable |
|---|---|---|
| **M0** | 1 | Decisions D1–D8 locked · monorepo + `packages/shared` · Prisma schema + first migration · Docker dev env with Keycloak |
| **M1** | 2–3 | SSO (OIDC) + session + RBAC · JIT provisioning + nightly sync · `GET /auth/session` + real frontend guard |
| **M2** | 3–4 | XP ledger + rules engine + level/streak · quests API (accept/progress) · badge evaluation |
| **M3** | 5 | Leaderboard snapshots + deltas · kudos API + anti-gaming · notifications + Socket.IO real-time |
| **M4** | 6 | Admin: analytics aggregations · demographics with k-anonymity · quest CRUD + visibility · audit log + view |
| **M5** | 7 | SDT survey engine: rounds, delivery, anonymous responses, participation tracking, export |
| **M6** | 8 | Frontend integration pass — all mock data → API + TanStack Query, loading/error states, MSW for tests |
| **M7** | 9 | Hardening — security review, PDPL checklist, test coverage, seed/demo data, deploy to staging |
| **M8** | 10 | Buffer · docs · thesis write-up support · demo prep |

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| IU IT dependency for SSO metadata + attribute mapping | Start the request in M0; develop against local Keycloak so you're never blocked |
| Admin analytics scope creep | Ship the Phase 1 chart set first; treat extra cuts as stretch |
| Survey usefulness vs. anonymity tension | k-anonymity threshold agreed up front with your supervisor |
| Solo-developer bandwidth | Keep M2–M3 rules minimal (few reason codes), polish later; M8 is a real buffer |
| Points gaming | Rate limits + caps + review queue from day one, not retrofitted |

---

## 15. Immediate next steps

1. Confirm **D1–D8** (or tell me your constraints and I'll finalise them).
2. I scaffold the **monorepo**: move `apps/web`, create `apps/api` (NestJS),
   `packages/shared` (types + XP curve), `docker-compose.dev.yml` with Keycloak.
3. Draft the **Prisma schema** + first migration from §5.
4. In parallel: send IU IT the **attribute-mapping request** from §3.
