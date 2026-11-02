# IU Gamified HR

A gamified employee-engagement platform for the **Islamic University of Madinah**,
built on Self-Determination Theory (autonomy · competence · relatedness) and the
PBL triad (Points, Badges, Leaderboards). Graduation project (GP2).

Staff earn XP by completing quests, receive peer kudos, unlock badges and
competencies, and climb a leaderboard. HR administrators manage quests, review
submissions, and run anonymous SDT pulse surveys.

## Features

- **Quests** — daily quests and epic challenges; staff accept, submit and get approved by a manager/admin.
- **XP, levels and leaderboard** — filter by period, scope and metric.
- **Badges** — earned vs. locked gallery.
- **Competency map** — four skill branches with unlock paths.
- **Kudos** — peer recognition with a university-wide feed.
- **Public profiles** — click a colleague to view their badges, competencies and recent kudos (read-only).
- **Pulse surveys** — admins pick SDT items from a question bank (1–5 scale). Responses are anonymous, and results are hidden until at least 5 people have answered.
- **Roles** — Employee, Manager and Admin, each with its own dashboard and permissions.
- **Bilingual** — English and Arabic with full RTL layout.
- **Admin panel** — analytics, quest management, survey rounds and an audit trail.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Vite, React 18, TypeScript, Tailwind CSS, Radix UI (shadcn-style), TanStack Query, react-router, react-i18next, Recharts |
| Backend | NestJS, Prisma 7, class-validator, JWT auth with role-based access |
| Database | PostgreSQL |

## Getting started

Requirements: Node.js 20+ and a running PostgreSQL instance.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env     # then edit DATABASE_URL and the JWT secrets
npx prisma migrate deploy
npx prisma generate
npm run seed:admin       # creates the first admin account (see .env)
npm run seed:badges
npm run seed:skills
npm run start:dev        # http://localhost:4000
```

### 2. Frontend

```bash
# from the repository root
npm install
cp .env.example .env     # VITE_API_BASE_URL defaults to http://localhost:4000
npm run dev              # http://localhost:5173
```

Sign in with the admin credentials from `backend/.env`. The access token is kept
in memory, so reloading the page signs you out.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend dev server |
| `npm run build` | Type-check and build the frontend to `dist/` |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run start:dev` (in `backend/`) | Run the API in watch mode |
| `npm run test` (in `backend/`) | Run backend unit tests |

## Project structure

```
src/                  frontend
  api/                axios client and per-feature API modules
  queries/            TanStack Query hooks
  pages/              one file per screen
  components/         ui primitives, common, layout, admin
  i18n/               en.ts / ar.ts dictionaries
  context/            session (auth + role)
backend/
  prisma/             schema, migrations, seed scripts
  src/                one NestJS module per feature
                      (auth, users, quests, assignments, badges, kudos,
                       leaderboard, surveys, skills, profiles, analytics, audit…)
Doc/                  project reports and presentations
```

## Notes

- `public/iu-mark.svg` is a neutral placeholder emblem, not the official university crest.
- Survey questions are adapted from common workplace SDT measures (Deci et al., 2001; Van den Broeck et al., 2010). The wording is paraphrased and has not been validated as a set.
- Dates render in Gregorian and Hijri (Umm al-Qura) via the `Intl` API.
