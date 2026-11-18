"use client";

// ─────────────────────────────────────────────
// NutritionClient — interactive nutrition page
// Receives server-fetched data, handles refresh.
// ─────────────────────────────────────────────

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "@/server/dates";
import { DailySummary } from "@/components/nutrition/daily-summary";
import { MealCard } from "@/components/nutrition/meal-card";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import type { MealType, ServingUnit } from "@/types/nutrition.types";

const MEAL_ORDER: MealType[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
  "PRE_WORKOUT",
  "POST_WORKOUT",
];

interface MealItemData {
  id: string;
  foodId: string;
  food: { name: string; brand: string | null };
  quantityG: number;
  quantity: number | null;
  servingUnit: ServingUnit;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
}

interface MealData {
  id: string;
  mealType: MealType;
  items: MealItemData[];
}

interface NutritionClientProps {
  date: Date;
  today: string;
  meals: MealData[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  targets: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    waterMl: number;
  };
  waterAmountMl: number;
}

export function NutritionClient({
  date,
  today,
  meals,
  totals,
  targets,
  waterAmountMl,
}: NutritionClientProps) {
  const router = useRouter();
  const dateStr = date.toISOString().split("T")[0];

  // Refresh server component data after mutation
  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleAddWater = async (amountMl: number) => {
    try {
      await api("/api/nutrition/water", { body: { amountMl, date: dateStr } });
      handleRefresh();
      toast.success(`Logged ${amountMl}ml water 💧`);
      return true;
    } catch {
      toast.error("Failed to log water");
      return false;
    }
  };

  // Build a map of mealType → items for quick lookup
  const mealMap = new Map<MealType, MealItemData[]>();
  for (const meal of meals) {
    mealMap.set(meal.mealType, meal.items);
  }

  // Calc per-meal totals
  const getMealTotals = (type: MealType) => {
    const items = mealMap.get(type) ?? [];
    return items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        proteinG: acc.proteinG + item.proteinG,
        carbsG: acc.carbsG + item.carbsG,
        fatG: acc.fatG + item.fatG,
        fiberG: acc.fiberG + (item.fiberG ?? 0),
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
    );
  };

  // Which meals to always show (main 4) vs show only if non-empty
  const primaryMeals: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
  const secondaryMeals: MealType[] = ["PRE_WORKOUT", "POST_WORKOUT"];
  const activeSecondary = secondaryMeals.filter((t) => (mealMap.get(t)?.length ?? 0) > 0);

  const visibleMeals = [...primaryMeals, ...activeSecondary];

  return (
    <div className="theme-nutrition min-h-screen bg-[var(--color-surface-0)] text-[var(--color-text-primary)] -mx-4 -mt-4 px-4 pt-4 pb-20 sm:-m-8 sm:p-8 space-y-8 animate-slide-up">
      {/* Page Hero/Header */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-8 text-[var(--color-text-primary)]">
        {/* Ember glow (Ember Night: colour only where it means something) */}
        <div aria-hidden="true" className="fs-glow-orb pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full" />
        
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Link
              href={`/nutrition?date=${addDays(dateStr, -1)}`}
              aria-label="Previous day"
              className="rounded-full bg-[var(--color-surface-3)] p-1.5 hover:bg-[var(--color-surface-4)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <p className="text-sm font-semibold tracking-[.16em] text-[var(--color-brand-400)] uppercase">
              {dateStr === today
                ? "Today"
                : new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date)}
            </p>
            {dateStr < today && (
              <Link
                href={dateStr === addDays(today, -1) ? "/nutrition" : `/nutrition?date=${addDays(dateStr, 1)}`}
                aria-label="Next day"
                className="rounded-full bg-[var(--color-surface-3)] p-1.5 hover:bg-[var(--color-surface-4)]"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] text-[var(--color-text-primary)]">
            Food that<br/>
            <span className="text-[var(--color-brand-400)]">nourishes life.</span>
          </h1>
        </div>
      </div>

      {/* Daily summary */}
      <DailySummary
        calories={totals.calories}
        proteinG={totals.proteinG}
        carbsG={totals.carbsG}
        fatG={totals.fatG}
        fiberG={totals.fiberG}
        calorieTarget={targets.calories}
        proteinTarget={targets.proteinG}
        carbsTarget={targets.carbsG}
        fatTarget={targets.fatG}
      />

      {/* Water Tracker */}
      <WaterTracker
        currentAmountMl={waterAmountMl}
        targetMl={targets.waterMl}
        onAdd={handleAddWater}
      />

      {/* Meal cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Meals
        </h2>
        <div className="space-y-3">
          {visibleMeals.map((mealType) => {
            const items = mealMap.get(mealType) ?? [];
            const mealTotals = getMealTotals(mealType);
            return (
              <MealCard
                key={mealType}
                mealType={mealType}
                date={dateStr}
                items={items}
                totalCalories={mealTotals.calories}
                totalProteinG={mealTotals.proteinG}
                totalCarbsG={mealTotals.carbsG}
                totalFatG={mealTotals.fatG}
                totalFiberG={mealTotals.fiberG}
                defaultOpen={mealType === "BREAKFAST"}
                onRefresh={handleRefresh}
              />
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-[var(--color-text-disabled)] text-center pb-4">
        Nutrition data is based on verified food database values. Actual values may vary depending on preparation method.
      </p>
    </div>
  );
}
