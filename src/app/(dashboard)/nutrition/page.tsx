import type { Metadata } from "next";
import { getRequiredUser } from "@/lib/auth";
import { getDayMeals, calcDailyTotals } from "@/services/nutrition.service";
import { prisma } from "@/lib/prisma";
import { NutritionClient } from "./_components/nutrition-client";

export const metadata: Metadata = {
  title: "Nutrition | FitStack",
  description: "Log your meals and track your daily macros",
};

// ─────────────────────────────────────────────
// Nutrition Page — Server Component
// Fetches today's data, passes to client.
// ─────────────────────────────────────────────

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getRequiredUser();
  const profile = user.profile;

  // Parse date from query string (defaults to today)
  const { date: dateParam } = await searchParams;
  let date: Date;
  if (dateParam) {
    const [y, m, d] = dateParam.split("-").map(Number);
    date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) date = new Date();
  } else {
    date = new Date();
  }

  // Fetch meals for the day
  const meals = await getDayMeals(user.id, date);
  const totals = calcDailyTotals(meals);

  // Fetch water logs for the day
  const waterLogs = await prisma.waterLog.findMany({
    where: { userId: user.id, date: date },
  });
  const waterAmountMl = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);

  // Targets from profile (with sane defaults if not set)
  const targets = {
    calories: profile?.dailyCalorieTarget ?? 2000,
    proteinG: profile?.dailyProteinTargetG ?? 150,
    carbsG: profile?.dailyCarbsTargetG ?? 250,
    fatG: profile?.dailyFatTargetG ?? 65,
    waterMl: (profile?.dailyWaterTargetL ?? 2.5) * 1000,
  };

  // Shape data for client (strip Prisma internals, keep only what we need)
  const clientMeals = meals.map((meal) => ({
    id: meal.id,
    mealType: meal.mealType as Parameters<typeof NutritionClient>[0]["meals"][number]["mealType"],
    items: meal.items.map((item) => ({
      id: item.id,
      foodId: item.foodId,
      food: { name: item.food.name, brand: item.food.brand },
      quantityG: item.quantityG,
      servingUnit: item.servingUnit as Parameters<typeof NutritionClient>[0]["meals"][number]["items"][number]["servingUnit"],
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
    })),
  }));

  return (
    <NutritionClient
      date={date}
      meals={clientMeals}
      totals={totals}
      targets={targets}
      waterAmountMl={waterAmountMl}
    />
  );
}
