# FitStack v2 — Rebuild Plan

**Positioning:** everything MyFitnessPal-class apps charge ₹400–900/month for, at **₹199/month**, built for Indian food and
hybrid training, mobile-first.

**Mobile strategy:** one Next.js codebase that is a proper installable **PWA**, shipped to the Play Store as a
**Trusted Web Activity** (Bubblewrap). Every API is plain JSON with Clerk auth (cookie on web, `Authorization: Bearer`
from a native shell), so a React Native/Expo client can be added later without touching the backend.

> ⚠️ Play Store billing: Google requires Play Billing for digital subscriptions sold inside Play apps. India allows
> *user-choice billing* (alternative billing next to Play Billing, with a reduced Google fee). Decide this before the
> Play Store release (phase 8) — it does not block phases 1–6.

---

## Phase 1 — Foundation (everything else builds on it)
- `src/server/` as the single home for server code: `auth.ts` (`requireUser`, `requireApiUser`, `requirePro`),
  `http.ts` (typed JSON responses, zod body parsing, error → status mapping), `dates.ts` (user timezone → "today").
- `FitnessProfile.timezone` (default `Asia/Kolkata`); every "today" is computed from it, every `@db.Date` stored as UTC midnight of the user's local day.
- zod validation on **every** API input.
- Prisma **migrations** (baseline) instead of `db push`; idempotent seed.
- Remove debug scripts, stale `.env.example`, duplicate `src/services` folder.
- Vitest unit tests for pure logic.

## Phase 2 — Security & payments
- Workout sync rewritten (no client-supplied ids trusted) — see phase 3.
- Payments: `PaymentOrder` table (orderId, userId, amount, status). Verify checks owner + amount + signature,
  is idempotent, and webhook does the same through one shared `grantPro()`. Renewals **stack** onto the current end date.
- Remove broken cancel route; subscription page shows "PRO until <date>" + renew.
- Entitlement checked on the **server** for premium pages and APIs (no more blurred-but-shipped data).
- Rate limit AI endpoints per user (DB-backed counter, works on serverless).
- Validate AI output against the DB before writing; user text passed as data, not instructions.
- Legal pages public.

## Phase 3 — Workouts
- Session API: granular endpoints (add exercise, add/update/delete set, reorder) that return real ids; ownership enforced via the session.
- Real duration (startedAt → completedAt), PR detection on set completion (best e1RM per exercise).
- Plan generator fills every day with exercises from the library (by day type, equipment, experience), sets/reps by goal; deactivates previous plan; batched inserts.
- Reschedule ("Move") implemented.

## Phase 4 — Nutrition
- Unit conversion: per-food `servingSizes` (e.g. 1 piece = 50 g) + generic volume table (cup 240 ml, tbsp 15, tsp 5); store grams + the unit/quantity the user typed.
- AI text/voice log matches existing foods first (search), creates a private food only when nothing matches, and reuses it next time.
- Weight log: upsert by local date, only update profile weight when it is the latest entry; no crash without profile.
- Water/meals/dashboard use the same date helper.

## Phase 5 — AI coach
- `useChat`-compatible streaming with **tools**: read today's nutrition, recent workouts, weight trend, recovery; log food, water, weight.
- Daily insight uses the same model/key and real 7-day data; cached server-side per user per day.
- Conversations kept (user can delete), not auto-wiped.

## Phase 6 — Free vs PRO + PWA
- **Free forever:** food logging (search, quick add, saved meals), water, weight, manual workout logging, basic dashboard.
- **PRO ₹199/30 days:** AI coach, AI food/workout logging, daily insights, plan generator, progress analytics, recovery.
- 7-day PRO trial for new users (no hard lock afterwards — they drop to Free).
- PWA: manifest, icons, service worker (offline shell), install prompt, `display: standalone`.

## Phase 7 — Redesign (later, with the user)
## Phase 8 — Deploy (Vercel + managed Postgres) and Play Store (TWA)

---

## Status (16 Nov 2026)
Phases 1–6 implemented on branch `upgrade`. Typecheck and production build pass; 31 unit tests and 10
database integration tests pass (`TEST_DATABASE_URL=... npm test`).

Still open before launch:
- Redesign (phase 7) — includes a real app icon, charts and the remaining `any`-typed UI files (lint).
- Contact page phone number placeholder; refund policy wording is yours to confirm.
- Landing page promises "macros that adjust on rest vs training days" — not built yet.
- Razorpay webhook: subscribe to `order.paid` and `payment.failed`.
- Existing production DB: `npx prisma migrate resolve --applied 0_init`, then `npm run db:migrate:prod`, then `npm run db:seed`.
