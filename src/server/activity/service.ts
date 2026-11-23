import "server-only";
import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AppUser } from "../auth";
import { HttpError, notFound } from "../http";
import { addDays, fromDbDate, localDateString, localHour, safeTimezone, startOfWeek, toDbDate, zonedToUtc } from "../dates";
import {
  BEST_EFFORT_DISTANCES,
  bestEfforts,
  caloriesBurned,
  cleanTrack,
  downsample,
  encodePolyline,
  summarize,
  type TrackPoint,
} from "./geo";

// ─────────────────────────────────────────────
// Activities: save (GPS or manual), list, detail, edit, delete, stats & PRs.
// The server recomputes every number from the raw points — client summaries
// are never trusted.
// ─────────────────────────────────────────────

const LIMITS = { maxElapsedSec: 24 * 3600, maxDistanceM: 300_000 };
const TYPE_WORD: Record<ActivityType, string> = { RUN: "Run", WALK: "Walk", HIKE: "Hike", RIDE: "Ride", TREADMILL: "Treadmill Run" };

export function defaultTitle(type: ActivityType, startedAt: Date, tz: string): string {
  const h = localHour(tz, startedAt);
  const part = h < 5 ? "Night" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
  return `${part} ${TYPE_WORD[type]}`;
}

type SaveGps = {
  source: "GPS";
  type: Exclude<ActivityType, "TREADMILL">;
  points: TrackPoint[];
  clientId: string;
  title?: string;
  notes?: string;
  feel?: number;
  isPrivate: boolean;
};
type SaveManual = {
  source: "MANUAL";
  type: ActivityType;
  date: string;
  startTime?: string;
  distanceM: number;
  durationSec: number;
  clientId: string;
  title?: string;
  notes?: string;
  feel?: number;
  isPrivate: boolean;
};

const detailInclude = {
  splits: { orderBy: { index: "asc" } },
  bestEfforts: { orderBy: { distanceM: "asc" } },
} satisfies Prisma.ActivityInclude;

export async function saveActivity(user: AppUser, input: SaveGps | SaveManual) {
  // Idempotent: a retried upload returns the activity that already exists.
  const existing = await prisma.activity.findUnique({
    where: { userId_clientId: { userId: user.id, clientId: input.clientId } },
    include: detailInclude,
  });
  if (existing) return { activity: existing, newPRs: [] as { distanceM: number; timeSec: number }[], duplicate: true };

  const tz = safeTimezone(user.profile?.timezone);
  const weightKg = user.profile?.currentWeightKg ?? 70;

  let data: Omit<Prisma.ActivityUncheckedCreateInput, "userId">;
  let splits: { index: number; distanceM: number; movingSec: number; elevDeltaM: number | null }[] = [];
  let efforts: { distanceM: number; timeSec: number }[] = [];

  if (input.source === "GPS") {
    const pts = cleanTrack(input.points, input.type);
    if (pts.length < 2) throw new HttpError(422, "Not enough GPS data to save this activity.", "VALIDATION");
    const s = summarize(pts, input.type);
    if (s.elapsedSec > LIMITS.maxElapsedSec || s.distanceM > LIMITS.maxDistanceM) {
      throw new HttpError(422, "This activity is too long to save (max 24 h / 300 km).", "VALIDATION");
    }
    const startedAt = new Date(s.startedAt);
    splits = s.splits;
    efforts = bestEfforts(s.cumDist, s.cumMoving, BEST_EFFORT_DISTANCES[input.type]);
    data = {
      type: input.type,
      source: "GPS",
      title: input.title ?? defaultTitle(input.type, startedAt, tz),
      notes: input.notes ?? null,
      feel: input.feel ?? null,
      isPrivate: input.isPrivate,
      clientId: input.clientId,
      date: toDbDate(localDateString(tz, startedAt)),
      startedAt,
      elapsedSec: s.elapsedSec,
      movingSec: s.movingSec,
      distanceM: s.distanceM,
      elevationGainM: s.elevationGainM,
      avgPaceSecPerKm: s.avgPaceSecPerKm,
      maxSpeedMps: s.maxSpeedMps,
      calories: caloriesBurned(input.type, weightKg, s.distanceM, s.movingSec),
      polyline: encodePolyline(downsample(pts, 2000)),
      startLat: pts[0].lat,
      startLng: pts[0].lng,
    };
  } else {
    const startedAt = zonedToUtc(input.date, input.startTime ?? "07:00", tz);
    if (startedAt.getTime() > Date.now() + 5 * 60_000) {
      throw new HttpError(422, "That start time is in the future.", "VALIDATION");
    }
    const pace = Math.round(input.durationSec / (input.distanceM / 1000));
    data = {
      type: input.type,
      source: "MANUAL",
      title: input.title ?? defaultTitle(input.type, startedAt, tz),
      notes: input.notes ?? null,
      feel: input.feel ?? null,
      isPrivate: input.isPrivate,
      clientId: input.clientId,
      date: toDbDate(input.date),
      startedAt,
      elapsedSec: input.durationSec,
      movingSec: input.durationSec,
      distanceM: input.distanceM,
      avgPaceSecPerKm: input.distanceM >= 100 ? pace : null,
      calories: caloriesBurned(input.type, weightKg, input.distanceM, input.durationSec),
    };
    // A manual activity's whole distance can only count as a best effort when it matches exactly.
    efforts = BEST_EFFORT_DISTANCES[input.type]
      .filter((d) => Math.abs(input.distanceM - d) < 1)
      .map((d) => ({ distanceM: d, timeSec: input.durationSec }));
  }

  const activity = await prisma.$transaction(async (tx) => {
    const a = await tx.activity.create({
      data: {
        ...data,
        userId: user.id,
        splits: { create: splits },
        bestEfforts: { create: efforts.map((e) => ({ ...e, userId: user.id, type: data.type as ActivityType })) },
      },
    });
    await recomputePRs(tx, user.id, data.type as ActivityType, efforts.map((e) => e.distanceM));
    return tx.activity.findUniqueOrThrow({ where: { id: a.id }, include: detailInclude });
  });

  const newPRs = activity.bestEfforts.filter((b) => b.isPR).map((b) => ({ distanceM: b.distanceM, timeSec: b.timeSec }));
  return { activity, newPRs, duplicate: false };
}

/** Mark the fastest effort per distance as the PR (ties: the earliest one keeps it). */
async function recomputePRs(tx: Prisma.TransactionClient, userId: string, type: ActivityType, distances: number[]) {
  for (const distanceM of new Set(distances)) {
    const best = await tx.bestEffort.findFirst({
      where: { userId, type, distanceM },
      orderBy: [{ timeSec: "asc" }, { activity: { startedAt: "asc" } }],
      select: { id: true },
    });
    await tx.bestEffort.updateMany({ where: { userId, type, distanceM, isPR: true, NOT: best ? { id: best.id } : undefined }, data: { isPR: false } });
    if (best) await tx.bestEffort.update({ where: { id: best.id }, data: { isPR: true } });
  }
}

export async function listActivities(userId: string, q: { type?: ActivityType; cursor?: string; limit: number }) {
  const rows = await prisma.activity.findMany({
    where: { userId, ...(q.type ? { type: q.type } : {}) },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    select: {
      id: true, type: true, source: true, title: true, date: true, startedAt: true, distanceM: true,
      movingSec: true, avgPaceSecPerKm: true, elevationGainM: true, calories: true, polyline: true, isPrivate: true,
      bestEfforts: { where: { isPR: true }, select: { distanceM: true } },
    },
  });
  const hasMore = rows.length > q.limit;
  const items = rows.slice(0, q.limit).map(({ bestEfforts: prs, ...a }) => ({ ...a, day: fromDbDate(a.date), prCount: prs.length }));
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getActivity(userId: string, id: string) {
  const a = await prisma.activity.findFirst({ where: { id, userId }, include: detailInclude });
  if (!a) throw notFound("Activity");
  return { ...a, day: fromDbDate(a.date) };
}

export async function updateActivity(
  userId: string,
  id: string,
  patch: { title?: string; notes?: string | null; feel?: number | null; isPrivate?: boolean },
) {
  const { count } = await prisma.activity.updateMany({ where: { id, userId }, data: patch });
  if (count === 0) throw notFound("Activity");
  return getActivity(userId, id);
}

export async function deleteActivity(userId: string, id: string) {
  const a = await prisma.activity.findFirst({ where: { id, userId }, select: { id: true, type: true, bestEfforts: { select: { distanceM: true } } } });
  if (!a) throw notFound("Activity");
  await prisma.$transaction(async (tx) => {
    await tx.activity.delete({ where: { id: a.id } });
    // The next-fastest effort becomes the PR again.
    await recomputePRs(tx, userId, a.type, a.bestEfforts.map((b) => b.distanceM));
  });
}

/** This week's totals, the last 12 weeks of distance, and personal bests. */
export async function activityStats(userId: string, today: string) {
  const weekStart = startOfWeek(today);
  const from = addDays(weekStart, -7 * 11);
  const [rows, prs, longest] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(today) } },
      select: { type: true, date: true, distanceM: true, movingSec: true, calories: true },
    }),
    prisma.bestEffort.findMany({
      where: { userId, isPR: true },
      orderBy: [{ type: "asc" }, { distanceM: "asc" }],
      select: { type: true, distanceM: true, timeSec: true, activityId: true, activity: { select: { date: true, title: true } } },
    }),
    prisma.activity.findFirst({
      where: { userId, type: "RUN" },
      orderBy: { distanceM: "desc" },
      select: { id: true, distanceM: true, date: true, title: true },
    }),
  ]);

  const week = { count: 0, distanceM: 0, movingSec: 0, calories: 0, byType: {} as Record<string, { count: number; distanceM: number }> };
  const weeks = Array.from({ length: 12 }, (_, i) => ({ weekStart: addDays(from, i * 7), distanceM: 0, count: 0 }));
  for (const r of rows) {
    const day = fromDbDate(r.date);
    const wi = Math.floor((new Date(`${day}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / (7 * 86_400_000));
    if (weeks[wi]) {
      weeks[wi].distanceM += r.distanceM;
      weeks[wi].count++;
    }
    if (day >= weekStart) {
      week.count++;
      week.distanceM += r.distanceM;
      week.movingSec += r.movingSec;
      week.calories += r.calories ?? 0;
      const t = (week.byType[r.type] ??= { count: 0, distanceM: 0 });
      t.count++;
      t.distanceM += r.distanceM;
    }
  }

  return {
    weekStart,
    week: { ...week, distanceM: Math.round(week.distanceM) },
    weeks: weeks.map((w) => ({ ...w, distanceM: Math.round(w.distanceM) })),
    personalBests: prs.map((p) => ({
      type: p.type,
      distanceM: p.distanceM,
      timeSec: p.timeSec,
      activityId: p.activityId,
      title: p.activity.title,
      day: fromDbDate(p.activity.date),
    })),
    longestRun: longest ? { ...longest, day: fromDbDate(longest.date) } : null,
  };
}

// ── For the AI coach ────────────────────────────────────────────────

const fmtPace = (sec: number | null | undefined) =>
  sec ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}/km` : null;

/**
 * Compact running picture for the coach: weekly mileage and pace trend, recent
 * activities with km splits, and personal bests. Numbers are rounded so the
 * prompt stays small.
 */
export async function runningForCoach(userId: string, today: string, weeks = 8) {
  const n = Math.min(Math.max(Math.round(weeks), 1), 26);
  const firstWeek = addDays(startOfWeek(today), -7 * (n - 1));
  const [rows, recent, prs] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, date: { gte: toDbDate(firstWeek), lte: toDbDate(today) } },
      select: { type: true, date: true, distanceM: true, movingSec: true, calories: true },
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        type: true, source: true, title: true, date: true, distanceM: true, movingSec: true, elapsedSec: true,
        avgPaceSecPerKm: true, elevationGainM: true, calories: true, feel: true, notes: true,
        splits: { orderBy: { index: "asc" }, select: { distanceM: true, movingSec: true } },
      },
    }),
    prisma.bestEffort.findMany({ where: { userId, isPR: true }, select: { type: true, distanceM: true, timeSec: true, activity: { select: { date: true } } } }),
  ]);

  const weeksOut = Array.from({ length: n }, (_, i) => ({ weekStart: addDays(firstWeek, i * 7), km: 0, runs: 0, runKm: 0, runSec: 0, kcal: 0 }));
  for (const r of rows) {
    const day = fromDbDate(r.date);
    const wi = Math.floor((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${firstWeek}T00:00:00Z`)) / (7 * 86_400_000));
    const w = weeksOut[wi];
    if (!w) continue;
    w.km += r.distanceM / 1000;
    w.kcal += r.calories ?? 0;
    if (r.type === "RUN" || r.type === "TREADMILL") {
      w.runs++;
      w.runKm += r.distanceM / 1000;
      w.runSec += r.movingSec;
    }
  }

  return {
    weeklyTotals: weeksOut.map((w) => ({
      weekStart: w.weekStart,
      totalKm: Math.round(w.km * 10) / 10,
      runs: w.runs,
      runKm: Math.round(w.runKm * 10) / 10,
      avgRunPace: w.runKm > 0 ? fmtPace(w.runSec / w.runKm) : null,
      kcalBurned: Math.round(w.kcal),
    })),
    recentActivities: recent.map((a) => ({
      date: fromDbDate(a.date),
      type: a.type,
      title: a.title,
      manual: a.source === "MANUAL",
      km: Math.round(a.distanceM / 10) / 100,
      movingMin: Math.round(a.movingSec / 6) / 10,
      stoppedMin: Math.round(Math.max(0, a.elapsedSec - a.movingSec) / 6) / 10,
      avgPace: fmtPace(a.avgPaceSecPerKm),
      kmSplits: a.splits.filter((s) => s.distanceM >= 900).map((s) => fmtPace(s.movingSec / (s.distanceM / 1000))),
      elevationGainM: a.elevationGainM != null ? Math.round(a.elevationGainM) : null,
      kcal: a.calories,
      feel: a.feel ? ["hard", "tough", "ok", "good", "great"][a.feel - 1] : null,
      notes: a.notes?.slice(0, 200) ?? null,
    })),
    personalBests: prs.map((p) => ({
      type: p.type,
      distanceKm: p.distanceM / 1000,
      time: `${Math.floor(p.timeSec / 60)}:${String(p.timeSec % 60).padStart(2, "0")}`,
      date: fromDbDate(p.activity.date),
    })),
  };
}

/** Activities on one local day (for "today" summaries). */
export async function activitiesOnDay(userId: string, day: string) {
  const rows = await prisma.activity.findMany({
    where: { userId, date: toDbDate(day) },
    orderBy: { startedAt: "asc" },
    select: { type: true, title: true, distanceM: true, movingSec: true, calories: true },
  });
  return {
    items: rows.map((r) => ({ type: r.type, title: r.title, km: Math.round(r.distanceM / 10) / 100, movingMin: Math.round(r.movingSec / 60), kcal: r.calories })),
    kcalBurned: rows.reduce((a, r) => a + (r.calories ?? 0), 0),
  };
}
