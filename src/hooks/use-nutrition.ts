"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { MealType, ServingUnit } from "@/types/nutrition.types";

// ─────────────────────────────────────────────
// useNutrition — client-side meal operations
// ─────────────────────────────────────────────
// Calls the API routes and triggers router refresh
// for server component re-rendering.

interface AddFoodParams {
  foodId: string;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  quantityG: number;
  servingUnit: ServingUnit;
  notes?: string;
}

interface UpdateItemParams {
  itemId: string;
  quantityG: number;
  servingUnit: ServingUnit;
  notes?: string;
}

interface QuickAddParams {
  mealType: MealType;
  date: string; // YYYY-MM-DD
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function useNutrition(onSuccess?: () => void) {
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addFood = useCallback(
    async (params: AddFoodParams): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/nutrition/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const json = await res.json();
        if (!json.success) {
          toast.error(json.error ?? "Failed to add food.");
          return false;
        }

        toast.success("Food added ✓");
        startTransition(() => {
          // Trigger re-render of server components on the page
          if (onSuccess) onSuccess();
        });
        return true;
      } catch {
        toast.error("Network error. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, startTransition],
  );

  const updateItem = useCallback(
    async (params: UpdateItemParams): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/nutrition/meals/${params.itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantityG: params.quantityG,
            servingUnit: params.servingUnit,
            notes: params.notes,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          toast.error(json.error ?? "Failed to update item.");
          return false;
        }

        toast.success("Updated ✓");
        startTransition(() => {
          if (onSuccess) onSuccess();
        });
        return true;
      } catch {
        toast.error("Network error. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, startTransition],
  );

  const quickAdd = useCallback(
    async (params: QuickAddParams): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/nutrition/meals/quick-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const json = await res.json();
        if (!json.success) {
          toast.error(json.error ?? "Failed to quick add macros.");
          return false;
        }

        toast.success("Macros added ✓");
        startTransition(() => {
          if (onSuccess) onSuccess();
        });
        return true;
      } catch {
        toast.error("Network error. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, startTransition],
  );

  const deleteItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/nutrition/meals/${itemId}`, {
          method: "DELETE",
        });

        const json = await res.json();
        if (!json.success) {
          toast.error(json.error ?? "Failed to remove item.");
          return false;
        }

        toast.success("Removed");
        startTransition(() => {
          if (onSuccess) onSuccess();
        });
        return true;
      } catch {
        toast.error("Network error. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, startTransition],
  );

  return {
    addFood,
    updateItem,
    deleteItem,
    quickAdd,
    isLoading: isSubmitting || isPending,
  };
}
