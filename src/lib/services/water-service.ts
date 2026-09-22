import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, eachDayOfInterval, format } from "date-fns";

export async function getWaterDashboardData(userId: string, date: Date = new Date()) {
  const profile = await prisma.fitnessProfile.findUnique({
    where: { userId },
    select: { dailyWaterTargetL: true },
  });

  const targetMl = (profile?.dailyWaterTargetL ?? 3.0) * 1000;

  const start = startOfDay(date);
  const end = endOfDay(date);

  const logs = await prisma.waterLog.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { loggedAt: "desc" },
  });

  const totalMl = logs.reduce((sum, log) => sum + log.amountMl, 0);

  return {
    targetMl,
    totalMl,
    logs,
  };
}

export async function getWaterTrends(userId: string) {
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, 29)); // Last 30 days

  const profile = await prisma.fitnessProfile.findUnique({
    where: { userId },
    select: { dailyWaterTargetL: true },
  });
  const targetMl = (profile?.dailyWaterTargetL ?? 3.0) * 1000;

  const allLogs = await prisma.waterLog.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const dailyTotals: Record<string, number> = {};
  allLogs.forEach((log) => {
    const dateStr = format(log.date, "yyyy-MM-dd");
    dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + log.amountMl;
  });

  const chartData = eachDayOfInterval({ start: startDate, end: endDate }).map((date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const amount = dailyTotals[dateStr] || 0;
    return {
      date: format(date, "MMM dd"),
      fullDate: date,
      amount,
      target: targetMl,
      metTarget: amount >= targetMl,
    };
  });

  // Calculate some insights
  const avgMl = chartData.reduce((sum, day) => sum + day.amount, 0) / 30;
  
  // Calculate longest streak
  let currentStreak = 0;
  let maxStreak = 0;
  
  chartData.forEach(day => {
    if (day.metTarget) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  });

  // Calculate current active streak
  let activeStreak = 0;
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i].metTarget) {
      activeStreak++;
    } else if (chartData[i].amount === 0 && i === chartData.length - 1) {
      // If today is empty, don't break the streak yet
      continue;
    } else {
      break;
    }
  }

  return {
    chartData,
    insights: {
      avgMl,
      maxStreak,
      activeStreak,
    },
  };
}
