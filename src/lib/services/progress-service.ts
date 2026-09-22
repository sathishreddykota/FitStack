import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { subDays, startOfDay, eachDayOfInterval, format } from "date-fns";

export type DateRange = 7 | 30 | 90 | "all";

function getStartDate(days: DateRange): Date | null {
  if (days === "all") return null;
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() - (days - 1)); // -1 to include today as day 1
  return d;
}

// ─────────────────────────────────────────────────────────
// 1. WEIGHT ANALYTICS
// ─────────────────────────────────────────────────────────
export async function getWeightAnalytics(userId: string, range: DateRange) {
  const profile = await prisma.fitnessProfile.findUnique({
    where: { userId },
    select: { currentWeightKg: true, targetWeightKg: true },
  });

  const startDate = getStartDate(range);
  const whereClause: Prisma.WeightLogWhereInput = { userId };
  if (startDate) {
    whereClause.date = { gte: startDate };
  }

  const allLogs = await prisma.weightLog.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  const rangeLogs = startDate ? allLogs.filter((l) => l.date >= startDate) : allLogs;

  const currentWeight =
    allLogs.length > 0
      ? allLogs[allLogs.length - 1].weightKg
      : profile?.currentWeightKg ?? null;

  const startingWeight =
    allLogs.length > 0
      ? allLogs[0].weightKg // Real first log
      : profile?.currentWeightKg ?? currentWeight;

  const targetWeight = profile?.targetWeightKg ?? null;

  let goalProgress = 0;
  if (startingWeight && currentWeight && targetWeight && startingWeight !== targetWeight) {
    if (targetWeight > startingWeight) {
      // Bulking
      goalProgress = ((currentWeight - startingWeight) / (targetWeight - startingWeight)) * 100;
    } else {
      // Cutting
      goalProgress = ((startingWeight - currentWeight) / (startingWeight - targetWeight)) * 100;
    }
  }

  goalProgress = Math.max(0, Math.min(100, goalProgress));

  return {
    logs: rangeLogs,
    currentWeight,
    startingWeight,
    targetWeight,
    goalProgress,
  };
}

// ─────────────────────────────────────────────────────────
// 2. NUTRITION ANALYTICS
// ─────────────────────────────────────────────────────────
export async function getNutritionAnalytics(userId: string, range: DateRange) {
  const profile = await prisma.fitnessProfile.findUnique({
    where: { userId },
    select: {
      dailyCalorieTarget: true,
      dailyProteinTargetG: true,
      dailyCarbsTargetG: true,
      dailyFatTargetG: true,
    },
  });

  const startDate = getStartDate(range) ?? startOfDay(subDays(new Date(), 90)); // Fallback to 90 days for "all" to prevent massive queries

  const meals = await prisma.meal.findMany({
    where: { userId, date: { gte: startDate } },
    include: { items: true },
    orderBy: { date: "asc" },
  });

  // Group by date
  const dailyTotals: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
  
  meals.forEach((meal) => {
    const dateStr = meal.date.toISOString().split("T")[0];
    if (!dailyTotals[dateStr]) {
      dailyTotals[dateStr] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    meal.items.forEach((item) => {
      dailyTotals[dateStr].calories += item.calories;
      dailyTotals[dateStr].protein += item.proteinG;
      dailyTotals[dateStr].carbs += item.carbsG;
      dailyTotals[dateStr].fat += item.fatG;
    });
  });

  const dates = Object.keys(dailyTotals);
  const daysTracked = dates.length;

  let avgCalories = 0;
  let avgProtein = 0;
  let avgCarbs = 0;
  let avgFat = 0;

  let daysCalorieGoalMet = 0;
  let daysProteinGoalMet = 0;

  if (daysTracked > 0) {
    avgCalories = Object.values(dailyTotals).reduce((s, d) => s + d.calories, 0) / daysTracked;
    avgProtein = Object.values(dailyTotals).reduce((s, d) => s + d.protein, 0) / daysTracked;
    avgCarbs = Object.values(dailyTotals).reduce((s, d) => s + d.carbs, 0) / daysTracked;
    avgFat = Object.values(dailyTotals).reduce((s, d) => s + d.fat, 0) / daysTracked;

    if (profile?.dailyCalorieTarget) {
      // +/- 10% tolerance for calories
      const minCal = profile.dailyCalorieTarget * 0.9;
      const maxCal = profile.dailyCalorieTarget * 1.1;
      daysCalorieGoalMet = Object.values(dailyTotals).filter(
        (d) => d.calories >= minCal && d.calories <= maxCal
      ).length;
    }

    if (profile?.dailyProteinTargetG) {
      // Accept anything over 90% of protein goal
      const minProtein = profile.dailyProteinTargetG * 0.9;
      daysProteinGoalMet = Object.values(dailyTotals).filter((d) => d.protein >= minProtein).length;
    }
  }

  // Generate chart data filling in missing days with 0
  const now = new Date();
  const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const chartData = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const data = dailyTotals[dateStr] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    // Offset the UTC date by timezone offset so local `format` prints the intended day
    const displayDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    chartData.push({
      date: format(displayDate, "MMM dd"),
      fullDate: d,
      calories: Math.round(data.calories),
      protein: Math.round(data.protein),
      carbs: Math.round(data.carbs),
      fat: Math.round(data.fat),
    });
  }

  return {
    chartData,
    averages: {
      calories: Math.round(avgCalories),
      protein: Math.round(avgProtein),
      carbs: Math.round(avgCarbs),
      fat: Math.round(avgFat),
    },
    targets: profile,
    daysTracked,
    adherence: {
      calories: daysTracked > 0 ? (daysCalorieGoalMet / daysTracked) * 100 : 0,
      protein: daysTracked > 0 ? (daysProteinGoalMet / daysTracked) * 100 : 0,
    },
  };
}

// ─────────────────────────────────────────────────────────
// 3. WORKOUT ANALYTICS
// ─────────────────────────────────────────────────────────
export async function getWorkoutAnalytics(userId: string, range: DateRange) {
  const startDate = getStartDate(range);
  const whereClause: Prisma.WorkoutSessionWhereInput = { userId, completedAt: { not: null } };
  if (startDate) {
    whereClause.date = { gte: startDate };
  }

  const sessions = await prisma.workoutSession.findMany({
    where: whereClause,
    include: {
      exercises: {
        include: {
          sets: true,
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const totalWorkouts = sessions.length;
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;

  // Group volume by date for charting
  const dailyVolume: Record<string, number> = {};

  sessions.forEach((session) => {
    const dateStr = session.date.toISOString().split("T")[0];
    if (!dailyVolume[dateStr]) dailyVolume[dateStr] = 0;

    session.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.completedAt) {
          totalSets++;
          if (set.reps) totalReps += set.reps;
          if (set.reps && set.weightKg) {
            const vol = set.reps * set.weightKg;
            totalVolume += vol;
            dailyVolume[dateStr] += vol;
          }
        }
      });
    });
  });

  // Chart data
  const chartData = Object.keys(dailyVolume).map((dateStr) => {
    const d = new Date(dateStr + "T00:00:00Z");
    const displayDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return {
      date: format(displayDate, "MMM dd"),
      fullDate: d,
      volume: dailyVolume[dateStr],
    };
  }).sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

  return {
    totalWorkouts,
    totalSets,
    totalReps,
    totalVolume,
    chartData,
    recentSessions: sessions.slice(-5).reverse(), // Last 5
  };
}

// ─────────────────────────────────────────────────────────
// 4. STRENGTH ANALYTICS & PRs
// ─────────────────────────────────────────────────────────

// Brzycki formula: 1RM = weight * (36 / (37 - reps))
function estimate1RM(weightKg: number, reps: number): number {
  if (reps > 10) {
    // Brzycki gets inaccurate > 10 reps, use a flat multiplier or just don't calculate.
    // For simplicity, we cap the estimation logic
    return Math.round(weightKg * (1 + reps / 30)); 
  }
  return Math.round(weightKg * (36 / (37 - reps)));
}

export async function getStrengthProgression(userId: string, exerciseId: string) {
  // Find all sets for this user and exercise
  const sessions = await prisma.workoutSession.findMany({
    where: { 
      userId, 
      completedAt: { not: null },
      exercises: { some: { exerciseId } }
    },
    include: {
      exercises: {
        where: { exerciseId },
        include: {
          sets: {
            where: { completedAt: { not: null }, reps: { not: null }, weightKg: { not: null } }
          }
        }
      }
    },
    orderBy: { date: "asc" }
  });

  const chartData: Array<{ date: string; fullDate: Date; estimated1RM: number; maxWeight: number; repsForMaxWeight: number }> = [];
  let allTimeMax1RM = 0;
  let allTimeMaxWeight = 0;

  sessions.forEach(session => {
    let sessionMax1RM = 0;
    let sessionMaxWeight = 0;
    let sessionBestRepsForMaxWeight = 0;

    session.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.reps && set.weightKg) {
          const e1rm = estimate1RM(set.weightKg, set.reps);
          if (e1rm > sessionMax1RM) sessionMax1RM = e1rm;
          
          if (set.weightKg > sessionMaxWeight) {
            sessionMaxWeight = set.weightKg;
            sessionBestRepsForMaxWeight = set.reps;
          } else if (set.weightKg === sessionMaxWeight && set.reps > sessionBestRepsForMaxWeight) {
            sessionBestRepsForMaxWeight = set.reps;
          }
        }
      });
    });

    if (sessionMax1RM > 0) {
      if (sessionMax1RM > allTimeMax1RM) allTimeMax1RM = sessionMax1RM;
      if (sessionMaxWeight > allTimeMaxWeight) allTimeMaxWeight = sessionMaxWeight;
      
      const displayDate = new Date(session.date.getTime() + session.date.getTimezoneOffset() * 60000);
      chartData.push({
        date: format(displayDate, "MMM dd"),
        fullDate: session.date,
        estimated1RM: sessionMax1RM,
        maxWeight: sessionMaxWeight,
        repsForMaxWeight: sessionBestRepsForMaxWeight
      });
    }
  });

  return {
    chartData,
    allTimeMax1RM,
    allTimeMaxWeight
  };
}

export async function getRecentPRs(userId: string) {
  // We look for sets marked as PR
  const prSets = await prisma.workoutSet.findMany({
    where: {
      isPersonalRecord: true,
      completedAt: { not: null },
      sessionExercise: {
        session: {
          userId
        }
      }
    },
    include: {
      sessionExercise: {
        include: {
          exercise: true,
          session: true
        }
      }
    },
    orderBy: {
      completedAt: "desc"
    },
    take: 10
  });

  return prSets.map(set => ({
    id: set.id,
    exerciseName: set.sessionExercise.exercise.name,
    date: set.sessionExercise.session.date,
    weightKg: set.weightKg,
    reps: set.reps,
    estimated1RM: (set.weightKg && set.reps) ? estimate1RM(set.weightKg, set.reps) : null
  }));
}
