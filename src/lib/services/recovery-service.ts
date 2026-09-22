import { prisma } from "@/lib/prisma";
import { format, subDays } from "date-fns";

export async function getRecoveryDashboardData(userId: string, dateStr: string) {
  // We use date strings (yyyy-MM-dd) to avoid timezone offset issues when querying @db.Date
  // dateStr should be in the format 'yyyy-MM-dd'

  // Prisma needs a Date object to query a DateTime field, even if it's @db.Date
  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  const [sleepLog, habitLog] = await Promise.all([
    prisma.sleepLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
    }),
    prisma.habitLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
    }),
  ]);

  return {
    sleep: sleepLog,
    habits: habitLog,
  };
}

export async function getRecoveryTrends(userId: string) {
  // Fetch the last 30 days of data
  // We'll generate the start and end dates natively
  const now = new Date();
  const endDateStr = format(now, "yyyy-MM-dd");
  const startDateStr = format(subDays(now, 29), "yyyy-MM-dd");

  const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
  const endDate = new Date(`${endDateStr}T00:00:00.000Z`);

  const [sleepLogs, habitLogs] = await Promise.all([
    prisma.sleepLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.habitLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  // Aggregate into chart data
  const chartDataMap: Record<string, any> = {};

  // Initialize all 30 days
  for (let i = 29; i >= 0; i--) {
    const dStr = format(subDays(now, i), "yyyy-MM-dd");
    const formattedDate = format(subDays(now, i), "MMM dd");
    chartDataMap[dStr] = {
      date: formattedDate,
      fullDate: dStr,
      sleepDuration: 0,
      sleepQuality: null,
      mood: null,
      energy: null,
      soreness: null,
    };
  }

  // Populate sleep data
  sleepLogs.forEach((log) => {
    // Prisma returns @db.Date as UTC midnight.
    // e.g. 2026-09-15T00:00:00.000Z
    const dStr = log.date.toISOString().split("T")[0]; // Fast string split to get yyyy-MM-dd without timezone shifting
    if (chartDataMap[dStr]) {
      chartDataMap[dStr].sleepDuration = (log.durationMinutes || 0) / 60; // Convert to hours
      chartDataMap[dStr].sleepQuality = log.quality;
    }
  });

  // Populate habit data
  habitLogs.forEach((log) => {
    const dStr = log.date.toISOString().split("T")[0];
    if (chartDataMap[dStr]) {
      chartDataMap[dStr].mood = log.mood;
      chartDataMap[dStr].energy = log.energyLevel;
      chartDataMap[dStr].soreness = log.sorenessLevel;
    }
  });

  const chartData = Object.values(chartDataMap);

  // Calculate Averages
  const validSleepLogs = sleepLogs.filter(l => l.durationMinutes);
  const avgSleepMinutes = validSleepLogs.length 
    ? validSleepLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0) / validSleepLogs.length 
    : 0;

  const validHabits = habitLogs.filter(l => l.energyLevel || l.mood);
  const avgEnergy = validHabits.length
    ? validHabits.reduce((sum, l) => sum + (l.energyLevel || 0), 0) / validHabits.length
    : 0;

  return {
    chartData,
    insights: {
      avgSleepHours: avgSleepMinutes / 60,
      avgEnergy,
      daysLogged: validHabits.length,
    }
  };
}
