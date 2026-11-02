# IU Gamified HR — Backend

NestJS API with Prisma 7 and PostgreSQL. See the [root README](../README.md) for full setup.

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma generate
npm run seed:admin && npm run seed:badges && npm run seed:skills
npm run start:dev     # http://localhost:4000
```

| Script | Purpose |
| --- | --- |
| `npm run start:dev` | Run in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run test` | Unit tests (Jest) |
| `npm run db:studio` | Open Prisma Studio |

Access is controlled with JWT auth and `@Roles('admin' | 'manager' | 'employee')` on routes.
