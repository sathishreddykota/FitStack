import "server-only";
import { prisma } from "@/lib/prisma";
import type { AppUser } from "../auth";
import { addDays, fromDbDate, toDbDate } from "../dates";
import { dailyTotals, getDayMeals } from "../nutrition/service";
import { DEFAULT_WATER_TARGET_ML, waterForDay } from "../tracking";

// ─────────────────────────────────────────────
// Compact, model-friendly summaries of the user's real data.
// Used by the coach's tools and by the daily insight.
// ─────────────────────────────────────────────

export function targetsOf(user: AppUser) {
  const p = user.profile;
  return {
    calories: p?.dailyCalorieTarget ?? null,
    proteinG: p?.dailyProteinTargetG ?? null,
    carbsG: p?.dailyCarbsTargetG ?? null,
    fatG: p?.dailyFatTargetG ?? null,
    waterMl: p?.dailyWaterTargetL ? Math.round(p.dailyWaterTargetL * 1000) : DEFAULT_WATER_TARGET_ML,
  };
}

export function profileSummary(user: AppUser) {
  const p = user.profile;
  if (!p) return { name: user.name, note: "Profile not set up yet" };
  return {
    name: user.name,
    age: p.age,
    sex: p.sex,
    heightCm: p.heightCm,
    currentWeightKg: p.currentWeightKg,
    targetWeightKg: p.targetWeightKg,
    goal: p.fitnessGoal,
    activityLevel: p.activityLevel,
    trainingStyle: p.trainingStyle,
    experience: p.trainingExperience,
    trainingDaysPerWeek: p.trainingDaysPerWeek,
    dietaryPreference: p.dietaryPreference,
    dailyTargets: targetsOf(user),
  };
}

export async function todaySummary(user: AppUser, today: string) {
  const [meals, water, sessions, sleep, weight] = await Promise.all([
    getDayMeals(user.id, today),
    waterForDay(user.id, today),
    prisma.workoutSession.findMany({
      where: { userId: user.id, date: toDbDate(today) },
      select: { name: true, status: true, durationMinutes: true },
    }),
    prisma.sleepLog.findUnique({ where: { userId_date: { userId: user.id, date: toDbDate(today) } } }),
    prisma.weightLog.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
  ]);
  return {
    date: today,
    eaten: dailyTotals(meals),
    meals: meals.map((m) => ({ meal: m.mealType, foods: m.items.map((i) => `${i.food.name} (${Math.round(i.calories)} kcal)`) })),
    waterMl: water.totalMl,
    targets: targetsOf(user),
    workouts: sessions,
    sleepHours: sleep?.durationMinutes ? Math.round((sleep.durationMinutes / 60) * 10) / 10 : null,
    latestWeight: weight ? { kg: weight.weightKg, date: fromDbDate(weight.date) } : null,
  };
}

/** Day-by-day history for the last N days (inclusive of today). */
export async function recentHistory(user: AppUser, today: string, days: number) {
  const n = Math.min(Math.max(days, 1), 60);
  const from = toDbDate(addDays(today, -(n - 1)));
  const to = toDbDate(today);
  const range = { gte: from, lte: to };

  const [items, water, sessions, weights, sleep, habits] = await Promise.all([
    prisma.mealItem.findMany({
      where: { meal: { userId: user.id, date: range } },
      select: { calories: true, proteinG: true, meal: { select: { date: true } } },
    }),
    prisma.waterLog.groupBy({ by: ["date"], where: { userId: user.id, date: range }, _sum: { amountMl: true } }),
    prisma.workoutSession.findMany({
      where: { userId: user.id, date: range },
      select: {
        date: true,
        name: true,
        status: true,
        exercises: {
          select: {
            exercise: { select: { name: true } },
            sets: { where: { completedAt: { not: null } }, select: { weightKg: true, reps: true, isPersonalRecord: true } },
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.weightLog.findMany({ where: { userId: user.id, date: range }, orderBy: { date: "asc" }, select: { date: true, weightKg: true } }),
    prisma.sleepLog.findMany({ where: { userId: user.id, date: range }, select: { durationMinutes: true, quality: true } }),
    prisma.habitLog.findMany({ where: { userId: user.id, date: range }, select: { energyLevel: true, sorenessLevel: true, mood: true } }),
  ]);

  const byDay = new Map<string, { calories: number; proteinG: number }>();
  for (const i of items) {
    const d = fromDbDate(i.meal.date);
    const cur = byDay.get(d) ?? { calories: 0, proteinG: 0 };
    cur.calories += i.calories;
    cur.proteinG += i.proteinG;
    byDay.set(d, cur);
  }
  const nutritionDays = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, t]) => ({ date, calories: Math.round(t.calories), proteinG: Math.round(t.proteinG) }));

  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

  return {
    days: n,
    targets: targetsOf(user),
    nutrition: {
      daysLogged: nutritionDays.length,
      avgCalories: avg(nutritionDays.map((d) => d.calories)),
      avgProteinG: avg(nutritionDays.map((d) => d.proteinG)),
      byDay: nutritionDays,
    },
    water: { daysLogged: water.length, avgMl: avg(water.map((w) => w._sum.amountMl ?? 0)) },
    workouts: {
      completed: sessions.filter((s) => s.status === "COMPLETED").length,
      skippedOrMissed: sessions.filter((s) => s.status === "SKIPPED" || s.status === "MISSED").length,
      sessions: sessions.map((s) => ({
        date: fromDbDate(s.date),
        name: s.name,
        status: s.status,
        exercises: s.exercises
          .filter((e) => e.sets.length)
          .map((e) => ({
            name: e.exercise.name,
            sets: e.sets.map((x) => `${x.weightKg ?? "BW"}×${x.reps ?? "?"}${x.isPersonalRecord ? " PR" : ""}`).join(", "),
          })),
      })),
    },
    weight: {
      entries: weights.map((w) => ({ date: fromDbDate(w.date), kg: w.weightKg })),
      changeKg: weights.length >= 2 ? Math.round((weights[weights.length - 1].weightKg - weights[0].weightKg) * 10) / 10 : null,
    },
    recovery: {
      avgSleepHours: avg(sleep.map((s) => (s.durationMinutes ?? 0) / 60).filter((h) => h > 0)),
      avgEnergy: avg(habits.map((h) => h.energyLevel).filter((v): v is number => v != null)),
      avgSoreness: avg(habits.map((h) => h.sorenessLevel).filter((v): v is number => v != null)),
    },
  };
}

export async function upcomingWorkouts(userId: string, today: string) {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, date: { gte: toDbDate(today), lte: toDbDate(addDays(today, 7)) }, status: { in: ["PLANNED", "IN_PROGRESS"] } },
    orderBy: { date: "asc" },
    select: {
      date: true,
      name: true,
      exercises: { orderBy: { orderIndex: "asc" }, select: { targetSets: true, targetReps: true, exercise: { select: { name: true } } } },
    },
  });
  return sessions.map((s) => ({
    date: fromDbDate(s.date),
    name: s.name,
    exercises: s.exercises.map((e) => `${e.exercise.name} ${e.targetSets ?? ""}×${e.targetReps ?? ""}`.trim()),
  }));
}
