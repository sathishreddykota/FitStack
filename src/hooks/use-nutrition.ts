"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import type { MealType, ServingUnit } from "@/types/nutrition.types";

// ─────────────────────────────────────────────
// useNutrition — client-side meal operations.
// Calls the API, toasts the result, then runs onSuccess (usually router.refresh).
// ─────────────────────────────────────────────

interface AddFoodParams {
  foodId: string;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  quantity: number;
  unit: ServingUnit;
  notes?: string;
}

interface UpdateItemParams {
  itemId: string;
  quantity: number;
  unit: ServingUnit;
  notes?: string;
}

interface QuickAddParams {
  mealType: MealType;
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  label?: string;
}

export function useNutrition(onSuccess?: () => void) {
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<unknown>, success: string, failure: string): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        await fn();
        toast.success(success);
        startTransition(() => onSuccess?.());
        return true;
      } catch (err) {
        toast.error(errorMessage(err, failure));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess],
  );

  const addFood = useCallback(
    (p: AddFoodParams) => run(() => api("/api/nutrition/meals", { body: p }), "Food added ✓", "Failed to add food."),
    [run],
  );

  const updateItem = useCallback(
    ({ itemId, ...body }: UpdateItemParams) =>
      run(() => api(`/api/nutrition/meals/${itemId}`, { method: "PATCH", body }), "Updated ✓", "Failed to update item."),
    [run],
  );

  const quickAdd = useCallback(
    (p: QuickAddParams) =>
      run(() => api("/api/nutrition/meals/quick-add", { body: p }), "Macros added ✓", "Failed to quick add."),
    [run],
  );

  const deleteItem = useCallback(
    (itemId: string) =>
      run(() => api(`/api/nutrition/meals/${itemId}`, { method: "DELETE" }), "Removed", "Failed to remove item."),
    [run],
  );

  return { addFood, updateItem, deleteItem, quickAdd, isLoading: isSubmitting || isPending };
}
