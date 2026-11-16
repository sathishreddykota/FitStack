import "server-only";
import type { SleepQuality } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "./http";
import { addDays, eachDay, fromDbDate, shortLabel, toDbDate } from "./dates";

// ─────────────────────────────────────────────
// Water, body weight, sleep and daily habits.
// All "date" params are the user's local day as "YYYY-MM-DD".
// ─────────────────────────────────────────────

export const DEFAULT_WATER_TARGET_ML = 3000;

// ── Water ───────────────────────────────────────────────────────────

export async function logWater(userId: string, date: string, amountMl: number) {
  return prisma.waterLog.create({ data: { userId, date: toDbDate(date), amountMl } });
}

export async function deleteWater(userId: string, id: string) {
  const { count } = await prisma.waterLog.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound("Water log");
}

export async function waterForDay(userId: string, date: string) {
  const logs = await prisma.waterLog.findMany({
    where: { userId, date: toDbDate(date) },
    orderBy: { loggedAt: "desc" },
  });
  return { logs, totalMl: logs.reduce((s, l) => s + l.amountMl, 0) };
}

export async function waterTrend(userId: string, today: string, targetMl: number, days = 30) {
  const from = addDays(today, -(days - 1));
  const grouped = await prisma.waterLog.groupBy({
    by: ["date"],
    where: { userId, date: { gte: toDbDate(from), lte: toDbDate(today) } },
    _sum: { amountMl: true },
  });
  const byDay = new Map(grouped.map((g) => [fromDbDate(g.date), g._sum.amountMl ?? 0]));
  const chartData = eachDay(from, today).map((d) => {
    const amount = byDay.get(d) ?? 0;
    return { date: shortLabel(d), day: d, amount, target: targetMl, metTarget: amount >= targetMl };
  });

  let maxStreak = 0;
  let run = 0;
  for (const d of chartData) {
    run = d.metTarget ? run + 1 : 0;
    maxStreak = Math.max(maxStreak, run);
  }
  // Current streak: today doesn't break it until the day is over.
  let activeStreak = 0;
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i].metTarget) activeStreak++;
    else if (i === chartData.length - 1) continue;
    else break;
  }
  const avgMl = chartData.reduce((s, d) => s + d.amount, 0) / chartData.length;
  return { chartData, insights: { avgMl, maxStreak, activeStreak } };
}

// ── Weight ──────────────────────────────────────────────────────────

export async function logWeight(
  userId: string,
  input: { date: string; weightKg: number; bodyFatPercent?: number | null; notes?: string },
) {
  const date = toDbDate(input.date);
  return prisma.$transaction(async (tx) => {
    const log = await tx.weightLog.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, weightKg: input.weightKg, bodyFatPercent: input.bodyFatPercent ?? null, notes: input.notes },
      update: { weightKg: input.weightKg, bodyFatPercent: input.bodyFatPercent ?? null, notes: input.notes },
    });
    // Only the most recent weigh-in becomes the profile's current weight (back-dated logs don't).
    const latest = await tx.weightLog.findFirst({ where: { userId }, orderBy: { date: "desc" } });
    if (latest?.id === log.id) {
      await tx.fitnessProfile.updateMany({ where: { userId }, data: { currentWeightKg: input.weightKg } });
    }
    return log;
  });
}

export async function deleteWeight(userId: string, id: string) {
  const { count } = await prisma.weightLog.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound("Weight log");
}

// ── Sleep & habits ──────────────────────────────────────────────────

export async function logSleep(
  userId: string,
  input: { date: string; durationMinutes: number; quality?: SleepQuality; notes?: string },
) {
  const date = toDbDate(input.date);
  const data = { durationMinutes: input.durationMinutes, quality: input.quality ?? null, notes: input.notes ?? null };
  return prisma.sleepLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...data },
    update: data,
  });
}

export async function logHabits(
  userId: string,
  input: { date: string; mood?: number; energyLevel?: number; sorenessLevel?: number; stepCount?: number; notes?: string },
) {
  const { date: day, ...fields } = input;
  const date = toDbDate(day);
  return prisma.habitLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, ...fields },
    update: fields,
  });
}

export async function recoveryForDay(userId: string, date: string) {
  const day = toDbDate(date);
  const [sleep, habits] = await Promise.all([
    prisma.sleepLog.findUnique({ where: { userId_date: { userId, date: day } } }),
    prisma.habitLog.findUnique({ where: { userId_date: { userId, date: day } } }),
  ]);
  return { sleep, habits };
}

export async function recoveryTrend(userId: string, today: string, days = 30) {
  const from = addDays(today, -(days - 1));
  const range = { gte: toDbDate(from), lte: toDbDate(today) };
  const [sleepLogs, habitLogs] = await Promise.all([
    prisma.sleepLog.findMany({ where: { userId, date: range } }),
    prisma.habitLog.findMany({ where: { userId, date: range } }),
  ]);
  const sleepBy = new Map(sleepLogs.map((l) => [fromDbDate(l.date), l]));
  const habitBy = new Map(habitLogs.map((l) => [fromDbDate(l.date), l]));

  const chartData = eachDay(from, today).map((d) => {
    const s = sleepBy.get(d);
    const h = habitBy.get(d);
    return {
      date: shortLabel(d),
      day: d,
      sleepHours: s?.durationMinutes != null ? Math.round((s.durationMinutes / 60) * 10) / 10 : null,
      sleepQuality: s?.quality ?? null,
      mood: h?.mood ?? null,
      energy: h?.energyLevel ?? null,
      soreness: h?.sorenessLevel ?? null,
    };
  });

  const sleepVals = sleepLogs.map((l) => l.durationMinutes).filter((v): v is number => v != null);
  const energyVals = habitLogs.map((l) => l.energyLevel).filter((v): v is number => v != null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const loggedDays = new Set([...sleepBy.keys(), ...habitBy.keys()]).size;

  return {
    chartData,
    insights: { avgSleepHours: avg(sleepVals) / 60, avgEnergy: avg(energyVals), daysLogged: loggedDays },
  };
}
