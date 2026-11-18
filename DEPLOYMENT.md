# Deployment

Two ways to run IU Gamified HR in production:

| | Free hosting (pilot) | Self-hosting with Docker |
| --- | --- | --- |
| Where | Vercel (web) + Render (API) + Neon (database) | One Linux server (e.g. at IU) |
| Cost | Free tier of each | Your server |
| HTTPS | Provided by Vercel / Render | Caddy, automatic Let's Encrypt certificate |
| Backups | Nightly encrypted GitHub Actions backup + Neon's 24 h restore | Nightly `backup` container, 7 daily + 4 weekly copies |
| Caveat | Render's free API sleeps after 15 min idle (~1 min to wake) | You maintain the server |

Uploaded files (quest submissions and attachments) are stored **in the database**, so they survive
redeploys and are part of every backup.

---

## Free hosting: Vercel + Render + Neon

### 1. Database (Neon)

1. Create a free project at neon.tech (region: **AWS Europe (Frankfurt)**, next to Render's).
2. Copy the **direct** connection string. In the connection dialog, turn **off** "Connection pooling",
   so the host does **not** contain `-pooler`. Live notifications use PostgreSQL `LISTEN/NOTIFY`,
   which doesn't work through a pooler. It looks like:
   `postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### 2. API (Render)

1. On render.com: **New → Blueprint**, pick this repository. Render reads `render.yaml`.
2. Fill in the values marked `sync: false`:
   - `DATABASE_URL`: the Neon direct connection string.
   - `CORS_ORIGIN`: your Vercel URL, e.g. `https://iu-gamified-hr.vercel.app` (you can edit it after step 4).
   - `RESEARCH_KEY`: `openssl rand -hex 32`. Give it only to the research team, and never change it during the study.
3. Deploy. Render builds, applies the database migrations on start, and checks `/health`.
4. Note the API URL, e.g. `https://iu-hr-api.onrender.com`. If Render added a suffix to the name,
   update the URL in `vercel.json` (step 4).

### 3. First administrator, badges and skills (once)

Render's free plan has no shell, so run the seed scripts from your own computer against Neon:

```bash
cd backend
DATABASE_URL="<neon direct url>" SEED_ADMIN_EMAIL="admin@iu.edu.sa" SEED_ADMIN_PASSWORD="<a long passphrase>" npm run seed:admin
DATABASE_URL="<neon direct url>" npm run seed:badges
DATABASE_URL="<neon direct url>" npm run seed:skills
```

### 4. Web app (Vercel)

1. In `vercel.json`, check that the `/api/:path*` rewrite points at your Render URL. Commit if you changed it.
2. On vercel.com: **Add New → Project**, import this repository (framework: Vite, root: repository root).
3. Environment variables:
   - `VITE_API_BASE_URL` = `/api`. The browser calls the API through Vercel's rewrite, so the sign-in
     cookie is first-party and Safari/Chrome don't block it.
   - `VITE_SOCKET_URL` = `https://iu-hr-api.onrender.com`. Live notifications connect straight to
     Render, because Vercel rewrites can't carry WebSockets. The socket uses the access token, not the cookie.
4. Deploy, then set Render's `CORS_ORIGIN` to the final Vercel URL if it changed.

### 5. Smoke test

- `https://<render-url>/health` returns `{"status":"ok","database":"ok",...}`.
- Sign in on the Vercel URL as the admin, create a department and a user, and sign in as them.
- Reload the page: you should stay signed in (this proves the first-party cookie works).
- Send Kudos from another account: the bell should update without a reload (live notifications).

### 6. Backups (GitHub Actions)

The repository is public, so backups are **encrypted** before they are stored. In GitHub:
**Settings → Secrets and variables → Actions → New repository secret**:

- `BACKUP_DATABASE_URL`: the Neon direct connection string.
- `BACKUP_PASSPHRASE`: a long random passphrase (`openssl rand -base64 32`). Keep a copy somewhere
  safe outside GitHub. Without it, backups can't be restored.

The **Database backup** workflow then runs nightly at 03:00 Riyadh time. Run it once by hand
(Actions → Database backup → Run workflow) to check it. Daily backups are kept 7 days and Sunday's
for 28 days. Neon's own point-in-time restore (last 24 h on the free plan) is a second layer.

### 7. Optional: avoid cold starts

Render's free API sleeps after 15 minutes without traffic. To keep it awake during Saudi working
hours (Sun–Thu, 07:00–19:00), add the repository **variable** (not secret) `KEEP_AWAKE_URL` =
`https://<render-url>/health`. The **Keep API awake** workflow then pings it every 10 minutes.

### Restore a backup

1. Actions → Database backup → open a run → download the artifact (a `.dump.enc` inside a zip).
2. Decrypt and restore (PostgreSQL 18 client tools):

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass pass:"<BACKUP_PASSPHRASE>" \
  -in iu-hr-<date>.dump.enc -out restore.dump
pg_restore --clean --if-exists --no-owner -d "<target database url>" restore.dump
```

Restore into a **new** Neon branch or database first to check it, then switch `DATABASE_URL` if needed.

---

## Self-hosting with Docker

Requirements: a Linux server with Docker, a DNS name pointing at it, and ports 80 and 443 reachable
(for the automatic certificate).

```bash
cp deploy/.env.example deploy/.env    # fill it in; secrets: openssl rand -hex 32
docker compose --env-file deploy/.env up -d --build
docker compose --env-file deploy/.env run --rm api npm run seed:admin
docker compose --env-file deploy/.env run --rm api npm run seed:badges
docker compose --env-file deploy/.env run --rm api npm run seed:skills
```

The stack:

- `db`: PostgreSQL 18 (data in the `db-data` volume).
- `api`: the NestJS API (applies migrations on start).
- `web`: Caddy. It serves the app, proxies `/api` and `/socket.io` to the API on one origin, and
  gets/renews the HTTPS certificate for `SITE_ADDRESS`.
- `backup`: a dump at start-up and every night at `BACKUP_AT`, checked with `pg_restore --list`,
  rotated to 7 daily + 4 weekly copies in `./backups`. Have IT copy that folder off the server.

Restore on the server:

```bash
docker compose --env-file deploy/.env exec -T db pg_restore --clean --if-exists --no-owner -U iu_hr -d iu_hr < backups/daily/<file>.dump
```

Local trial on a laptop: set `SITE_ADDRESS=localhost`, `PUBLIC_URL=https://localhost:8443`,
`HTTP_PORT=8080`, `HTTPS_PORT=8443`. `SITE_ADDRESS` is what Caddy listens for inside the container (always
ports 80/443); `PUBLIC_URL` is the address the browser uses, including the host port. Caddy uses its own local certificate, so the browser shows a warning.

---

## Environment variables (API)

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | (required) | PostgreSQL connection (direct, not pooled). |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | (required) | Token signing. In production: 32+ random characters, different from each other. |
| `CORS_ORIGIN` | `http://localhost:5173` | Web app origin(s), comma-separated. Also used for the CSRF origin check. |
| `NODE_ENV` | | `production` enables the strict startup checks and secure cookies. |
| `PORT` | `4000` | |
| `COOKIE_PATH` | `/auth` | `/api/auth` behind the `/api` proxy (Vercel, Caddy). |
| `COOKIE_SAME_SITE` | `none` in production, else `lax` | `lax` behind a same-site proxy. |
| `TRUST_PROXY_HOPS` | `1` in production | Proxies in front of the API (Vercel + Render = 2). |
| `RESEARCH_KEY` | (unset = research track off) | Pseudonym key for the research study. |
| `BCRYPT_ROUNDS` | `10` | Password hashing cost (10–14). |
| `DB_POOL_SIZE` | `20` | Database connections per API instance (Neon free: 5). |
| `RATE_LIMIT_PER_MINUTE` | `300` | Requests per minute per client IP. |
| `LOGIN_ATTEMPTS_PER_15_MIN` | `5` | Sign-in attempts per IP + email. |
| `RETENTION_NOTIFICATIONS_DAYS` / `RETENTION_DEACTIVATED_DAYS` / `RETENTION_REVOKED_SESSIONS_DAYS` | `365` / `365` / `30` | PDPL retention. |
| `RETENTION_JOB_ENABLED` | `true` | Daily cleanup at 03:00. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | | Used only by `npm run seed:admin`. |

Web app (build time): `VITE_API_BASE_URL` (`http://localhost:4000` in development, `/api` in
production) and `VITE_SOCKET_URL` (only needed when the API is on another host, i.e. Vercel + Render).

## Known limits of the free setup

- One API instance: rate limits and live-notification rooms are kept in memory. That's fine for one
  instance; several instances would need Redis (see `backend/loadtest/results/summary.md`).
- Neon free: 0.5 GB storage (database including uploaded files), and the compute sleeps when idle
  (the first query after a pause takes about a second).
- Render free: 750 instance-hours a month (enough for one service running all month), and cold starts
  after 15 idle minutes.
