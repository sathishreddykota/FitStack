import type { Metadata } from "next";
import { requireOnboardedUser, todayOf } from "@/server/auth";
import { isValidDateString, toDbDate } from "@/server/dates";
import { dailyTotals, getDayMeals } from "@/server/nutrition/service";
import { waterForDay } from "@/server/tracking";
import { targetsOf } from "@/server/coach/context";
import { NutritionClient } from "./_components/nutrition-client";

export const metadata: Metadata = {
  title: "Nutrition",
  description: "Log your meals and track your daily macros",
};

// Nutrition page — server component. ?date=YYYY-MM-DD, defaults to the user's local today.
export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireOnboardedUser();
  const { date: dateParam } = await searchParams;
  const today = todayOf(user).str;
  const date = dateParam && isValidDateString(dateParam) && dateParam <= today ? dateParam : today;

  const [meals, water] = await Promise.all([getDayMeals(user.id, date), waterForDay(user.id, date)]);
  const t = targetsOf(user);

  const clientMeals = meals.map((meal) => ({
    id: meal.id,
    mealType: meal.mealType,
    items: meal.items.map((item) => ({
      id: item.id,
      foodId: item.foodId,
      food: { name: item.food.name, brand: item.food.brand },
      quantityG: item.quantityG,
      quantity: item.quantity,
      servingUnit: item.servingUnit,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
    })),
  }));

  return (
    <NutritionClient
      date={toDbDate(date)}
      today={today}
      meals={clientMeals}
      totals={dailyTotals(meals)}
      targets={{
        calories: t.calories ?? 2000,
        proteinG: t.proteinG ?? 120,
        carbsG: t.carbsG ?? 250,
        fatG: t.fatG ?? 65,
        waterMl: t.waterMl,
      }}
      waterAmountMl={water.totalMl}
    />
  );
}
