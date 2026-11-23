# Daystrong

Nutrition, training, water and recovery tracking with an AI coach — built for India, mobile first.
**Free** for logging; **PRO ₹199 / 30 days** for the AI coach, AI logging, training plans and analytics.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Clerk · PostgreSQL + Prisma 6 ·
Vercel AI SDK v7 + Gemini · Razorpay · Vitest. Installable PWA (Play Store via Trusted Web Activity).

## Getting started

```bash
npm install
cp .env.example .env.local      # fill in keys
cp .env.local .env              # Prisma CLI reads .env
npm run db:migrate:prod         # apply migrations
npm run db:seed                 # foods, serving sizes, exercises (safe to re-run)
npm run dev
```

**Existing database created with `db push` (v1)?** Mark the baseline as applied once, then migrate:

```bash
npx prisma migrate resolve --applied 0_init
npm run db:migrate:prod
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests. Set `TEST_DATABASE_URL` (migrated + seeded Postgres) to also run the DB integration and API route tests |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:migrate` | Create a new migration in development |
| `npm run db:migrate:prod` | Apply migrations (CI / production) |
| `npm run db:seed` | Idempotent seed |

## Architecture

```
src/server/        all server logic (never imported by client components except pure helpers)
  auth.ts          requireUser / requireApiUser / assertPro, user timezone
  http.ts          JSON envelope { success, data | error, code }, zod body/query parsing, route() wrapper
  dates.ts         ONE date rule: calendar days are the user's local day stored as UTC midnight
  entitlements.ts  free/PRO/trial logic, AI limits
  payments.ts      Razorpay orders, idempotent grant shared by /verify and the webhook
  nutrition/       food search, logging, saved meals, unit→gram conversion, AI food logging
  workout/         plan builder, scheduling, granular session/set API, PRs, AI workout logging
  coach/           coach tools (read data, log food/water/weight), streaming chat, daily insight
  tracking.ts      water, weight, sleep, habits
  progress.ts      analytics
src/app/api/       thin route handlers (validate → service → ok())
src/lib/api-client.ts  typed fetch helper for the browser (and a future native app)
```

Every API route authenticates with Clerk (cookie on web, `Authorization: Bearer` from a native shell),
validates input with zod, and enforces ownership on the server.

See `docs/REBUILD_PLAN.md` for the roadmap.
