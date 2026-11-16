import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, eachDay, fromDbDate, shortLabel, toDbDate } from "./dates";
import { estimate1RM } from "./workout/strength";

// ─────────────────────────────────────────────
// Progress analytics. `today` is the user's local day ("YYYY-MM-DD").
// ─────────────────────────────────────────────

export type DateRange = 7 | 30 | 90 | "all";

function rangeStart(range: DateRange, today: string): string | null {
  return range === "all" ? null : addDays(today, -(range - 1));
}

// ── Weight ──────────────────────────────────────────────────────────

export async function getWeightAnalytics(userId: string, range: DateRange, today: string) {
  const [profile, allLogs] = await Promise.all([
    prisma.fitnessProfile.findUnique({ where: { userId }, select: { currentWeightKg: true, targetWeightKg: true } }),
    prisma.weightLog.findMany({ where: { userId }, orderBy: { date: "asc" }, select: { id: true, date: true, weightKg: true } }),
  ]);
  const start = rangeStart(range, today);
  const logs = start ? allLogs.filter((l) => fromDbDate(l.date) >= start) : allLogs;

  const currentWeight = allLogs.at(-1)?.weightKg ?? profile?.currentWeightKg ?? null;
  const startingWeight = allLogs[0]?.weightKg ?? profile?.currentWeightKg ?? null;
  const targetWeight = profile?.targetWeightKg ?? null;

  let goalProgress = 0;
  if (startingWeight != null && currentWeight != null && targetWeight != null && startingWeight !== targetWeight) {
    goalProgress = ((currentWeight - startingWeight) / (targetWeight - startingWeight)) * 100;
  }

  // 7-entry moving average smooths daily water-weight noise.
  const withAvg = logs.map((l, i) => {
    const win = logs.slice(Math.max(0, i - 6), i + 1);
    return { ...l, day: fromDbDate(l.date), avg: Math.round((win.reduce((s, x) => s + x.weightKg, 0) / win.length) * 10) / 10 };
  });

  return {
    logs: withAvg,
    currentWeight,
    startingWeight,
    targetWeight,
    goalProgress: Math.max(0, Math.min(100, goalProgress)),
  };
}

// ── Nutrition ───────────────────────────────────────────────────────

export async function getNutritionAnalytics(userId: string, range: DateRange, today: string) {
  // "all" is capped at 90 days to keep the query bounded.
  const start = rangeStart(range, today) ?? addDays(today, -89);
  const [profile, items] = await Promise.all([
    prisma.fitnessProfile.findUnique({
      where: { userId },
      select: { dailyCalorieTarget: true, dailyProteinTargetG: true, dailyCarbsTargetG: true, dailyFatTargetG: true },
    }),
    prisma.mealItem.findMany({
      where: { meal: { userId, date: { gte: toDbDate(start), lte: toDbDate(today) } } },
      select: { calories: true, proteinG: true, carbsG: true, fatG: true, meal: { select: { date: true } } },
    }),
  ]);

  const byDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
  for (const i of items) {
    const d = fromDbDate(i.meal.date);
    const t = byDay.get(d) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    t.calories += i.calories;
    t.protein += i.proteinG;
    t.carbs += i.carbsG;
    t.fat += i.fatG;
    byDay.set(d, t);
  }
  const tracked = [...byDay.values()];
  const daysTracked = tracked.length;
  const avg = (k: keyof (typeof tracked)[number]) =>
    daysTracked ? Math.round(tracked.reduce((s, d) => s + d[k], 0) / daysTracked) : 0;

  const calTarget = profile?.dailyCalorieTarget;
  const proTarget = profile?.dailyProteinTargetG;
  const calMet = calTarget ? tracked.filter((d) => d.calories >= calTarget * 0.9 && d.calories <= calTarget * 1.1).length : 0;
  const proMet = proTarget ? tracked.filter((d) => d.protein >= proTarget * 0.9).length : 0;

  const chartData = eachDay(start, today).map((d) => {
    const t = byDay.get(d);
    return {
      date: shortLabel(d),
      day: d,
      calories: Math.round(t?.calories ?? 0),
      protein: Math.round(t?.protein ?? 0),
      carbs: Math.round(t?.carbs ?? 0),
      fat: Math.round(t?.fat ?? 0),
    };
  });

  return {
    chartData,
    averages: { calories: avg("calories"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat") },
    targets: profile,
    daysTracked,
    adherence: {
      calories: daysTracked ? (calMet / daysTracked) * 100 : 0,
      protein: daysTracked ? (proMet / daysTracked) * 100 : 0,
    },
  };
}

// ── Workouts ────────────────────────────────────────────────────────

export async function getWorkoutAnalytics(userId: string, range: DateRange, today: string) {
  const start = rangeStart(range, today);
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
      date: start ? { gte: toDbDate(start), lte: toDbDate(today) } : { lte: toDbDate(today) },
    },
    select: {
      id: true,
      name: true,
      date: true,
      durationMinutes: true,
      exercises: { select: { sets: { where: { completedAt: { not: null } }, select: { weightKg: true, reps: true } } } },
    },
    orderBy: { date: "asc" },
  });

  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  const volumeByDay = new Map<string, number>();
  for (const s of sessions) {
    const d = fromDbDate(s.date);
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        totalSets++;
        totalReps += set.reps ?? 0;
        const v = (set.weightKg ?? 0) * (set.reps ?? 0);
        totalVolume += v;
        volumeByDay.set(d, (volumeByDay.get(d) ?? 0) + v);
      }
    }
  }

  return {
    totalWorkouts: sessions.length,
    totalSets,
    totalReps,
    totalVolume: Math.round(totalVolume),
    totalMinutes: sessions.reduce((s, x) => s + (x.durationMinutes ?? 0), 0),
    chartData: [...volumeByDay.entries()].map(([d, volume]) => ({ date: shortLabel(d), day: d, volume: Math.round(volume) })),
    recentSessions: sessions
      .slice(-5)
      .reverse()
      .map((s) => ({ id: s.id, name: s.name, date: s.date, day: fromDbDate(s.date) })),
  };
}

// ── Strength ────────────────────────────────────────────────────────

export async function getStrengthProgression(userId: string, exerciseId: string) {
  const rows = await prisma.sessionExercise.findMany({
    where: { exerciseId, session: { userId } },
    select: {
      session: { select: { date: true } },
      sets: {
        where: { completedAt: { not: null }, setType: { not: "WARMUP" }, weightKg: { not: null }, reps: { gt: 0 } },
        select: { weightKg: true, reps: true },
      },
    },
    orderBy: { session: { date: "asc" } },
  });

  const byDay = new Map<string, { estimated1RM: number; maxWeight: number; repsForMaxWeight: number }>();
  for (const r of rows) {
    const d = fromDbDate(r.session.date);
    const cur = byDay.get(d) ?? { estimated1RM: 0, maxWeight: 0, repsForMaxWeight: 0 };
    for (const s of r.sets) {
      cur.estimated1RM = Math.max(cur.estimated1RM, estimate1RM(s.weightKg!, s.reps!));
      if (s.weightKg! > cur.maxWeight || (s.weightKg === cur.maxWeight && s.reps! > cur.repsForMaxWeight)) {
        cur.maxWeight = s.weightKg!;
        cur.repsForMaxWeight = s.reps!;
      }
    }
    if (cur.estimated1RM > 0) byDay.set(d, cur);
  }
  const chartData = [...byDay.entries()].map(([d, v]) => ({ date: shortLabel(d), day: d, ...v }));
  return {
    chartData,
    allTimeMax1RM: chartData.reduce((m, x) => Math.max(m, x.estimated1RM), 0),
    allTimeMaxWeight: chartData.reduce((m, x) => Math.max(m, x.maxWeight), 0),
  };
}

export async function getRecentPRs(userId: string, limit = 10) {
  const sets = await prisma.workoutSet.findMany({
    where: { isPersonalRecord: true, completedAt: { not: null }, sessionExercise: { session: { userId } } },
    select: {
      id: true,
      weightKg: true,
      reps: true,
      completedAt: true,
      sessionExercise: { select: { exercise: { select: { name: true } }, session: { select: { date: true } } } },
    },
    orderBy: { completedAt: "desc" },
    take: limit,
  });
  return sets.map((s) => ({
    id: s.id,
    exerciseName: s.sessionExercise.exercise.name,
    date: s.sessionExercise.session.date,
    weightKg: s.weightKg,
    reps: s.reps,
    estimated1RM: s.weightKg && s.reps ? estimate1RM(s.weightKg, s.reps) : null,
  }));
}

/** Exercises the user has trained, key lifts first (for the strength dropdown). */
export async function trainedExercises(userId: string) {
  const ex = await prisma.exercise.findMany({
    where: { sessionExercises: { some: { session: { userId }, sets: { some: { completedAt: { not: null } } } } } },
    select: { id: true, name: true, isKeyLift: true },
    orderBy: [{ isKeyLift: "desc" }, { name: "asc" }],
    take: 30,
  });
  return ex.map(({ id, name }) => ({ id, name }));
}
