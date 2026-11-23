// ─────────────────────────────────────────────
// Plans & entitlements (pure logic — unit tested)
//
// FREE  (forever): food logging, quick add, saved meals, water, weight,
//                  manual workout logging, basic dashboard.
// PRO   (₹199 / 30 days, or 7-day trial for new users): AI coach, AI food &
//                  workout logging, daily insights, plan generator,
//                  progress analytics, recovery tracking.
//
// Nobody is ever locked out of the app: when PRO ends you drop back to FREE.
// ─────────────────────────────────────────────

export const TRIAL_DAYS = 7;
export const PRO_PRICE_PAISE = 19_900; // ₹199
export const PRO_GRANT_DAYS = 30;

const DAY_MS = 86_400_000;

export type PlanSource = "trial" | "paid" | null;

export interface Entitlement {
  isPro: boolean;
  source: PlanSource;
  /** When PRO access ends (null when not PRO). */
  proUntil: Date | null;
  trialEndsAt: Date;
  /** Whole days of PRO left, rounded up (0 when not PRO). */
  daysLeft: number;
}

export interface EntitlementInput {
  createdAt: Date;
  subscription?: { currentPeriodEnd: Date | null; status: string | null } | null;
}

export function getEntitlement(user: EntitlementInput, now: Date = new Date()): Entitlement {
  const trialEndsAt = new Date(user.createdAt.getTime() + TRIAL_DAYS * DAY_MS);
  const sub = user.subscription;
  const paidUntil = sub && sub.status === "active" && sub.currentPeriodEnd ? sub.currentPeriodEnd : null;

  const paidActive = !!paidUntil && paidUntil > now;
  const trialActive = trialEndsAt > now;

  let proUntil: Date | null = null;
  if (paidActive && trialActive) proUntil = paidUntil! > trialEndsAt ? paidUntil! : trialEndsAt;
  else if (paidActive) proUntil = paidUntil;
  else if (trialActive) proUntil = trialEndsAt;

  const isPro = proUntil !== null;
  return {
    isPro,
    source: paidActive ? "paid" : trialActive ? "trial" : null,
    proUntil,
    trialEndsAt,
    daysLeft: isPro ? Math.ceil((proUntil!.getTime() - now.getTime()) / DAY_MS) : 0,
  };
}

/**
 * New PRO period after a payment. Renewals STACK: paying while still PRO
 * extends from the current end date instead of restarting from today.
 */
export function extendPeriod(
  currentEnd: Date | null,
  grantDays: number,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  return { start: now, end: new Date(base.getTime() + grantDays * DAY_MS) };
}

/** Daily AI limits per feature for PRO users. */
export const AI_DAILY_LIMITS = {
  coach: 80,
  foodParse: 60,
  workoutParse: 40,
  insight: 3,
} as const;

export type AIFeature = keyof typeof AI_DAILY_LIMITS;
