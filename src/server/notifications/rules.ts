// ─────────────────────────────────────────────
// Notification rules — pure functions, no database, no clock.
//
// Given a snapshot of one user's day (what they logged, their targets, what we
// already sent today) and their local time, decide which notifications are due
// and write their text. The scheduler (every 15 min) calls `dueScheduled`; the
// meal-logging code calls `dueAchievements` right after a log.
// ─────────────────────────────────────────────

import { diffDays } from "@/server/dates";

export type NotificationKind =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "goals_left"
  | "recap"
  | "miss_you"
  | "calories_hit"
  | "protein_hit"
  | "fat_hit"
  | "fiber_hit"
  | "perfect_day";

export interface Notification {
  kind: NotificationKind;
  title: string;
  body: string;
  /** Screen to open when tapped. */
  url: string;
}

export interface Prefs {
  enabled: boolean;
  mealReminders: boolean;
  goalReminders: boolean;
  achievements: boolean;
  morningRecap: boolean;
  breakfastAt: string;
  lunchAt: string;
  dinnerAt: string;
  summaryAt: string;
  recapAt: string;
  quietStart: string;
  quietEnd: string;
}

export const DEFAULT_PREFS: Prefs = {
  enabled: true,
  mealReminders: true,
  goalReminders: true,
  achievements: true,
  morningRecap: true,
  breakfastAt: "10:30",
  lunchAt: "14:30",
  dinnerAt: "21:00",
  summaryAt: "21:30",
  recapAt: "08:00",
  quietStart: "22:00",
  quietEnd: "07:30",
};

export interface Totals {
  calories: number;
  proteinG: number;
  fatG: number;
  fiberG: number;
}

export interface Targets {
  calories: number;
  proteinG: number;
  fatG: number;
  fiberG: number;
}

export interface DaySnapshot {
  /** User's local day, "YYYY-MM-DD". */
  today: string;
  /** User's local time as minutes since midnight (0–1439). */
  minutes: number;
  /** Local day the account was created. Nothing is sent on that day. */
  signupDay: string;
  /** Meal types with at least one item logged today ("BREAKFAST", "LUNCH", …). */
  mealsLogged: string[];
  totals: Totals;
  /** null when the user hasn't finished onboarding (no calorie target yet). */
  targets: Targets | null;
  /** Kinds already sent today. */
  sentToday: NotificationKind[];
  /** Last local day with anything logged, or null if never. */
  lastLoggedDay: string | null;
  /** True when "We miss you" was already sent since the last log. */
  missYouSent: boolean;
  /** Yesterday's totals, or null if nothing was logged yesterday. */
  yesterday: Totals | null;
  /** Consecutive days with logging, ending yesterday. */
  streak: number;
}

/** Max notifications per local day. */
export const DAILY_CAP = 5;
/** A scheduled reminder may go out up to this long after its time (covers a late or skipped scheduler run). */
export const SLOT_WINDOW_MIN = 60;
/** Days without logging after which reminders pause. */
export const INACTIVE_DAYS = 3;

/** Fiber guideline: 14 g per 1,000 kcal. */
export const fiberTargetFor = (calories: number) => Math.round((calories * 14) / 1000);

/** "HH:MM" → minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function isValidTime(hhmm: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

/** Is `minutes` inside the quiet window? Handles windows that cross midnight (22:00–07:30). */
export function inQuietHours(minutes: number, prefs: Pick<Prefs, "quietStart" | "quietEnd">): boolean {
  const start = toMinutes(prefs.quietStart);
  const end = toMinutes(prefs.quietEnd);
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const n = (x: number) => nf.format(Math.round(x));

// ── Goals ────────────────────────────────────

export type Goal = "calories" | "protein" | "fat" | "fiber";
export const GOALS: Goal[] = ["calories", "protein", "fat", "fiber"];

/**
 * When does a goal count as hit?
 *  - protein, fiber: reaching the target (more is fine)
 *  - calories, fat: within ±10% of the target (they are targets, not "more is better")
 */
export function goalHit(goal: Goal, totals: Totals, targets: Targets): boolean {
  switch (goal) {
    case "protein":
      return totals.proteinG >= targets.proteinG;
    case "fiber":
      return totals.fiberG >= targets.fiberG;
    case "calories":
      return totals.calories >= targets.calories * 0.9 && totals.calories <= targets.calories * 1.1;
    case "fat":
      return totals.fatG >= targets.fatG * 0.9 && totals.fatG <= targets.fatG * 1.1;
  }
}

/** What's still open, as short phrases: "38 g protein", "410 kcal", "You're 250 kcal over". */
function openGoals(totals: Totals, targets: Targets): { short: string[]; over: string | null } {
  const short: string[] = [];
  let over: string | null = null;
  if (!goalHit("protein", totals, targets)) short.push(`${n(targets.proteinG - totals.proteinG)} g protein`);
  if (totals.calories > targets.calories * 1.1) over = `You're ${n(totals.calories - targets.calories)} kcal over today — no stress, tomorrow is a fresh start.`;
  else if (!goalHit("calories", totals, targets)) short.push(`${n(targets.calories - totals.calories)} kcal`);
  if (!goalHit("fiber", totals, targets)) short.push(`${n(targets.fiberG - totals.fiberG)} g fiber`);
  if (totals.fatG < targets.fatG * 0.9) short.push(`${n(targets.fatG - totals.fatG)} g fat`);
  return { short, over };
}

// ── Scheduled reminders ──────────────────────

const PRIORITY: NotificationKind[] = ["miss_you", "recap", "breakfast", "lunch", "dinner", "goals_left"];

function slotDue(snapshot: DaySnapshot, at: string): boolean {
  const start = toMinutes(at);
  return snapshot.minutes >= start && snapshot.minutes < start + SLOT_WINDOW_MIN;
}

/** Is the user taking a break (no logging for INACTIVE_DAYS)? Counts from signup if they never logged. */
export function isInactive(snapshot: DaySnapshot): boolean {
  const last = snapshot.lastLoggedDay ?? snapshot.signupDay;
  return diffDays(last, snapshot.today) >= INACTIVE_DAYS;
}

/** Common gates: switched off, signup day, quiet hours, daily cap. Returns how many more may be sent. */
function room(snapshot: DaySnapshot, prefs: Prefs): number {
  if (!prefs.enabled) return 0;
  if (snapshot.today <= snapshot.signupDay) return 0;
  if (inQuietHours(snapshot.minutes, prefs)) return 0;
  return Math.max(0, DAILY_CAP - snapshot.sentToday.length);
}

/** Reminders due right now (scheduler). At most one run's worth, highest priority first. */
export function dueScheduled(snapshot: DaySnapshot, prefs: Prefs = DEFAULT_PREFS): Notification[] {
  const left = room(snapshot, prefs);
  if (left === 0) return [];
  const sent = new Set(snapshot.sentToday);
  const out: Notification[] = [];
  const add = (x: Notification) => {
    if (!sent.has(x.kind)) out.push(x);
  };

  // Taking a break: one gentle nudge, then silence until they log again.
  if (isInactive(snapshot)) {
    if (!snapshot.missYouSent && slotDue(snapshot, prefs.breakfastAt)) {
      add({
        kind: "miss_you",
        title: "We miss you 👋",
        body: "Log one meal today and your reminders pick up where you left off.",
        url: "/nutrition",
      });
    }
    return out.slice(0, left);
  }

  const logged = new Set(snapshot.mealsLogged);
  const t = snapshot.targets;

  if (prefs.morningRecap && snapshot.yesterday && t && slotDue(snapshot, prefs.recapAt)) {
    add(recap(snapshot.yesterday, t, snapshot.streak));
  }

  if (prefs.mealReminders) {
    if (!logged.has("BREAKFAST") && slotDue(snapshot, prefs.breakfastAt)) {
      add({ kind: "breakfast", title: "No breakfast logged yet 🍳", body: "Tap to add it — it takes 10 seconds.", url: "/nutrition" });
    }
    if (!logged.has("LUNCH") && slotDue(snapshot, prefs.lunchAt)) {
      add({
        kind: "lunch",
        title: "Lunch not logged yet",
        body: t ? `You're at ${n(snapshot.totals.calories)} / ${n(t.calories)} kcal today.` : "Tap to log what you had.",
        url: "/nutrition",
      });
    }
    if (!logged.has("DINNER") && slotDue(snapshot, prefs.dinnerAt)) {
      add({ kind: "dinner", title: "Dinner not logged yet", body: "Log it to keep today's numbers accurate.", url: "/nutrition" });
    }
  }

  if (prefs.goalReminders && t && slotDue(snapshot, prefs.summaryAt)) {
    const x = goalsLeft(snapshot, t);
    if (x) add(x);
  }

  // The evening summary already says what's missing — don't also buzz about dinner.
  const final = out.some((x) => x.kind === "goals_left") ? out.filter((x) => x.kind !== "dinner") : out;
  final.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  return final.slice(0, left);
}

function goalsLeft(snapshot: DaySnapshot, t: Targets): Notification | null {
  if (snapshot.mealsLogged.length === 0) {
    return { kind: "goals_left", title: "Nothing logged today", body: "Add today's meals to see how close you got to your goals.", url: "/nutrition" };
  }
  const { short, over } = openGoals(snapshot.totals, t);
  if (short.length === 0 && !over) return null; // all hit — the achievement already said so
  const body = [short.length ? `Still to go today: ${short.join(" · ")}.` : null, over].filter(Boolean).join(" ");
  return { kind: "goals_left", title: short.length ? "Almost there for today" : "Today's calories", body, url: "/dashboard" };
}

function recap(y: Totals, t: Targets, streak: number): Notification {
  const hit = GOALS.filter((g) => goalHit(g, y, t));
  const parts: string[] = [];
  if (hit.length === GOALS.length) parts.push("Yesterday: all 4 goals hit ✅");
  else {
    parts.push(`Yesterday: ${hit.length} of 4 goals hit.`);
    // Name the biggest miss, so the recap says what to fix today.
    if (!hit.includes("protein")) parts.push(`Protein was ${n(t.proteinG - y.proteinG)} g short.`);
    else if (!hit.includes("fiber")) parts.push(`Fiber was ${n(t.fiberG - y.fiberG)} g short.`);
    else if (!hit.includes("calories"))
      parts.push(y.calories > t.calories ? `Calories were ${n(y.calories - t.calories)} over.` : `Calories were ${n(t.calories - y.calories)} under.`);
    else parts.push(y.fatG > t.fatG ? `Fat was ${n(y.fatG - t.fatG)} g over.` : `Fat was ${n(t.fatG - y.fatG)} g under.`);
  }
  if (streak >= 2) parts.push(`${streak}-day streak 🔥`);
  return { kind: "recap", title: streak >= 2 ? `${streak}-day logging streak 🔥` : "Your day yesterday", body: parts.join(" "), url: "/dashboard" };
}

// ── Achievements (right after a log) ─────────

const HIT_KIND: Record<Goal, NotificationKind> = {
  calories: "calories_hit",
  protein: "protein_hit",
  fat: "fat_hit",
  fiber: "fiber_hit",
};

const HIT_TEXT: Record<Goal, (x: Totals, t: Targets) => Omit<Notification, "kind">> = {
  protein: (x, t) => ({ title: "Protein goal hit 💪", body: `${n(x.proteinG)} / ${n(t.proteinG)} g today. Great work.`, url: "/dashboard" }),
  calories: (x, t) => ({ title: "Calorie goal on target 🎯", body: `${n(x.calories)} / ${n(t.calories)} kcal today.`, url: "/dashboard" }),
  fiber: (x, t) => ({ title: "Fiber goal hit 🥦", body: `${n(x.fiberG)} / ${n(t.fiberG)} g today.`, url: "/dashboard" }),
  fat: (x, t) => ({ title: "Fat goal on target", body: `${n(x.fatG)} / ${n(t.fatG)} g today.`, url: "/dashboard" }),
};

/**
 * Goals newly reached that we haven't celebrated today. When the last of the
 * four lands, one "Perfect day" replaces the single-goal message.
 */
export function dueAchievements(snapshot: DaySnapshot, prefs: Prefs = DEFAULT_PREFS): Notification[] {
  const t = snapshot.targets;
  if (!t || !prefs.achievements) return [];
  const left = room(snapshot, prefs);
  if (left === 0) return [];
  const sent = new Set(snapshot.sentToday);
  if (sent.has("perfect_day")) return [];

  const hit = GOALS.filter((g) => goalHit(g, snapshot.totals, t));
  if (hit.length === GOALS.length) {
    return [{ kind: "perfect_day", title: "Perfect day ✅", body: "Calories, protein, fat and fiber all on target.", url: "/dashboard" }];
  }
  return hit
    .filter((g) => !sent.has(HIT_KIND[g]))
    .map((g) => ({ kind: HIT_KIND[g], ...HIT_TEXT[g](snapshot.totals, t) }))
    .slice(0, left);
}
