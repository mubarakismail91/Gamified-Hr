# IU Gamified HR — Phase 1 Frontend Prototype

A clickable, visually complete frontend preview of a gamified employee-engagement
platform for the **Islamic University of Madinah**, built on Self-Determination
Theory (autonomy · competence · relatedness) and the PBL triad (Points, Badges,
Leaderboards).

**Phase 1 = frontend only.** No backend, no real authentication. All data is mock
data in `src/data/`. The SSO flow is a visual simulation.

---

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Click **Sign in with University Portal** to enter.

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` only |

---

## Tech stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** with an IU theme (green `#006C35`, gold `#C8A45D`, navy ink)
- **shadcn-style UI primitives** (`src/components/ui/`) on Radix
- **react-router-dom** for routing, **react-i18next** for EN/AR
- **Recharts** for the admin analytics
- **sonner** for toasts

## Prototype controls

- **Language toggle** (navbar) — switches EN ↔ AR with full RTL layout flip.
- **Preview as** (navbar) — role switcher: Employee / Manager / HR / Administrator.
  Changes which navigation items and admin tools appear. Not part of the real product.
- **Back to IU Portal** — link to `iu.edu.sa` (portal-continuity cue).

## Screens

| Route | Screen |
| --- | --- |
| `/` | Landing / SSO entry (+ simulated handshake) |
| `/dashboard` | Employee dashboard — XP, rank ring, stats, badges, activity |
| `/leaderboard` | Leaderboard with period / scope / metric filters |
| `/quests` | Daily quests + epic challenges, accept & track |
| `/badges` | Badge gallery — earned (colour) vs locked (greyed) |
| `/skills` | Competence map — 4 branches, unlock paths |
| `/kudos` | Peer recognition — send Kudos + university feed |
| `/profile` | Full profile — overview / badges / competencies / history |
| `/notifications` | Notification centre with filters |
| `/admin` | HR & Admin panel — analytics, demographics, quest CRUD, SDT surveys, audit trail |

## Project structure

```
src/
  data/          all mock data (staff, quests, badges, skills, kudos, analytics…)
  i18n/          en.ts / ar.ts dictionaries + config
  lib/           utils, date+Hijri helpers, xp curve, cross-cutting selectors
  hooks/         useLocale (language + dir + bilingual resolver)
  context/       SessionContext (auth + role), NotificationsContext
  components/
    ui/          Radix-based primitives (button, card, dialog, select, …)
    common/      BrandMark, StatCard, PersonAvatar, DateStamp, LevelRing, …
    layout/      Navbar, Sidebar (NavLinks), Footer, AppShell
    dashboard/   RankHero, BadgeShowcase, ActivityFeed
    admin/       Charts (Recharts), QuestManager
  pages/         one file per screen
```

## Notes & known placeholders

- `public/iu-mark.svg` is a **neutral placeholder emblem** — replace with the
  official university crest before any real use.
- Bundle size warning on build is expected (Recharts + Radix); code-splitting is
  a Phase 2 optimisation.
- Dates render Gregorian + Hijri (Umm al-Qura) via the `Intl` API.
