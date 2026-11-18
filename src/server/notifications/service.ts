import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, fromDbDate, localDateString, localMinutes, safeTimezone, toDbDate } from "@/server/dates";
import { dailyTotals } from "@/server/nutrition/service";
import {
  DEFAULT_PREFS,
  dueAchievements,
  dueScheduled,
  fiberTargetFor,
  type DaySnapshot,
  type Notification,
  type NotificationKind,
  type Prefs,
  type Totals,
} from "./rules";

// ─────────────────────────────────────────────
// Database side of notifications: load one user's day as a DaySnapshot, read
// their preferences, and record what was sent (at most once per kind per day).
// Sending to phones comes in step 2.
// ─────────────────────────────────────────────

/** How far back the logging streak is counted. */
const STREAK_LOOKBACK_DAYS = 60;

const itemTotals = { select: { calories: true, proteinG: true, carbsG: true, fatG: true, fiberG: true } } as const;

const toTotals = (t: ReturnType<typeof dailyTotals>): Totals => ({ calories: t.calories, proteinG: t.proteinG, fatG: t.fatG, fiberG: t.fiberG });

export async function prefsFor(userId: string): Promise<Prefs> {
  const row = await prisma.notificationPrefs.findUnique({ where: { userId } });
  if (!row) return DEFAULT_PREFS;
  return Object.fromEntries(Object.keys(DEFAULT_PREFS).map((k) => [k, row[k as keyof Prefs]])) as unknown as Prefs;
}

/** Everything the rules need about one user's day, as of `now`. null if the user doesn't exist. */
export async function loadDaySnapshot(userId: string, now: Date = new Date()): Promise<DaySnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      profile: { select: { timezone: true, dailyCalorieTarget: true, dailyProteinTargetG: true, dailyFatTargetG: true } },
    },
  });
  if (!user) return null;

  const tz = safeTimezone(user.profile?.timezone);
  const today = localDateString(tz, now);
  const yesterday = addDays(today, -1);

  const [todayMeals, yesterdayMeals, loggedDays, sent, lastMissYou] = await Promise.all([
    prisma.meal.findMany({ where: { userId, date: toDbDate(today) }, select: { mealType: true, items: itemTotals } }),
    prisma.meal.findMany({ where: { userId, date: toDbDate(yesterday) }, select: { items: itemTotals } }),
    // Days with at least one item logged, newest first (for the streak and "last logged").
    prisma.meal.findMany({
      where: { userId, date: { lte: toDbDate(today) }, items: { some: {} } },
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "desc" },
      take: STREAK_LOOKBACK_DAYS + 1,
    }),
    prisma.notificationLog.findMany({ where: { userId, day: toDbDate(today) }, select: { kind: true } }),
    prisma.notificationLog.findFirst({ where: { userId, kind: "miss_you" }, orderBy: { day: "desc" }, select: { day: true } }),
  ]);

  const days = loggedDays.map((d) => fromDbDate(d.date));
  const lastLoggedDay = days[0] ?? null;

  // Streak: consecutive logged days ending yesterday.
  const logged = new Set(days);
  let streak = 0;
  for (let d = yesterday; logged.has(d) && streak < STREAK_LOOKBACK_DAYS; d = addDays(d, -1)) streak++;

  const p = user.profile;
  const targets =
    p?.dailyCalorieTarget && p.dailyProteinTargetG && p.dailyFatTargetG
      ? { calories: p.dailyCalorieTarget, proteinG: p.dailyProteinTargetG, fatG: p.dailyFatTargetG, fiberG: fiberTargetFor(p.dailyCalorieTarget) }
      : null;

  const yesterdayHasItems = yesterdayMeals.some((m) => m.items.length > 0);
  const missDay = lastMissYou ? fromDbDate(lastMissYou.day) : null;

  return {
    today,
    minutes: localMinutes(tz, now),
    signupDay: localDateString(tz, user.createdAt),
    mealsLogged: todayMeals.filter((m) => m.items.length > 0).map((m) => m.mealType),
    totals: toTotals(dailyTotals(todayMeals)),
    targets,
    sentToday: sent.map((s) => s.kind as NotificationKind),
    lastLoggedDay,
    missYouSent: missDay !== null && (lastLoggedDay === null || missDay > lastLoggedDay),
    yesterday: yesterdayHasItems ? toTotals(dailyTotals(yesterdayMeals)) : null,
    streak,
  };
}

/**
 * Reserve a notification kind for a local day. Returns true if this call got it;
 * false if it was already sent (another run, a retry). Claim BEFORE sending.
 */
export async function claim(userId: string, day: string, kind: NotificationKind): Promise<boolean> {
  const { count } = await prisma.notificationLog.createMany({
    data: [{ userId, day: toDbDate(day), kind }],
    skipDuplicates: true,
  });
  return count === 1;
}

/** Scheduled reminders due for this user now, already claimed (safe to send). */
export async function claimScheduled(userId: string, now: Date = new Date()): Promise<Notification[]> {
  const [snapshot, prefs] = await Promise.all([loadDaySnapshot(userId, now), prefsFor(userId)]);
  if (!snapshot) return [];
  return claimAll(userId, snapshot.today, dueScheduled(snapshot, prefs));
}

/** Achievements earned by the latest log, already claimed (safe to send). */
export async function claimAchievements(userId: string, now: Date = new Date()): Promise<Notification[]> {
  const [snapshot, prefs] = await Promise.all([loadDaySnapshot(userId, now), prefsFor(userId)]);
  if (!snapshot) return [];
  return claimAll(userId, snapshot.today, dueAchievements(snapshot, prefs));
}

async function claimAll(userId: string, day: string, due: Notification[]): Promise<Notification[]> {
  const out: Notification[] = [];
  for (const n of due) if (await claim(userId, day, n.kind)) out.push(n);
  return out;
}
