"use client";

// ─────────────────────────────────────────────
// FoodSearchModal — search food and add to meal
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { Search, X, Check, Plus, Loader2, Bookmark, Zap } from "lucide-react";
import { useFoodSearch } from "@/hooks/use-food-search";
import { useNutrition } from "@/hooks/use-nutrition";
import { cn } from "@/lib/utils";
import type { MealType, FoodSearchResult, ServingUnit } from "@/types/nutrition.types";

const SERVING_UNITS: ServingUnit[] = ["g", "kg", "ml", "L", "cup", "tbsp", "tsp", "piece", "slice", "serving", "scoop"];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
  PRE_WORKOUT: "Pre-Workout",
  POST_WORKOUT: "Post-Workout",
};

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  onSuccess: () => void;
}

export function FoodSearchModal({
  isOpen,
  onClose,
  mealType,
  date,
  onSuccess,
}: FoodSearchModalProps) {
  const { query, setQuery, results, isLoading: searching, clearSearch } = useFoodSearch();
  const { addFood, quickAdd, isLoading: adding } = useNutrition(onSuccess);

  // Selected food state
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<ServingUnit>("g");

  const [activeTab, setActiveTab] = useState<"search" | "myMeals" | "quickAdd">("search");
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [addingMealId, setAddingMealId] = useState<string | null>(null);

  const [qaCalories, setQaCalories] = useState("");
  const [qaProtein, setQaProtein] = useState("");
  const [qaCarbs, setQaCarbs] = useState("");
  const [qaFat, setQaFat] = useState("");

  useEffect(() => {
    if (isOpen && activeTab === "myMeals") {
      const fetchMeals = async () => {
        setLoadingMeals(true);
        try {
          const res = await fetch("/api/nutrition/saved-meals");
          const data = await res.json();
          setSavedMeals(data.savedMeals || []);
        } catch (error) {
          console.error("Failed to fetch saved meals:", error);
        } finally {
          setLoadingMeals(false);
        }
      };
      fetchMeals();
    }
  }, [isOpen, activeTab]);

  const handleLogSavedMeal = async (id: string) => {
    setAddingMealId(id);
    try {
      const res = await fetch(`/api/nutrition/saved-meals/${id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealType, date }),
      });
      if (res.ok) {
        onSuccess();
        handleClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingMealId(null);
    }
  };

  // Preview nutrition calculation
  const preview = selected
    ? {
        calories: Math.round((selected.caloriesPer100g * parseFloat(quantity || "0")) / 100),
        proteinG: Math.round((selected.proteinPer100g * parseFloat(quantity || "0")) / 100 * 10) / 10,
        carbsG: Math.round((selected.carbsPer100g * parseFloat(quantity || "0")) / 100 * 10) / 10,
        fatG: Math.round((selected.fatPer100g * parseFloat(quantity || "0")) / 100 * 10) / 10,
      }
    : null;

  const handleSelectFood = useCallback((food: FoodSearchResult) => {
    setSelected(food);
    setQuantity(food.defaultServingSizeG.toString());
    setUnit(food.defaultServingUnit as ServingUnit);
  }, []);

  const handleAdd = async () => {
    if (!selected) return;
    const q = parseFloat(quantity);
    if (isNaN(q) || q < 1) return;

    // Convert to grams for storage if unit is not 'g'
    let quantityG = q;
    if (unit === "kg") quantityG = q * 1000;
    else if (unit === "ml") quantityG = q; // 1ml water ≈ 1g — close enough for most liquids
    else if (unit === "L") quantityG = q * 1000;
    // For volumetric units (cup, tbsp, etc.) we use default serving as 100g baseline
    // Users can adjust per food. More precise conversion is a Phase 16+ feature.

    const ok = await addFood({
      foodId: selected.id,
      mealType,
      date,
      quantityG,
      servingUnit: unit,
    });

    if (ok) {
      setSelected(null);
      clearSearch();
      onClose();
    }
  };

  const handleQuickAddSubmit = async () => {
    const cals = parseInt(qaCalories);
    if (isNaN(cals) || cals < 0) return;

    const ok = await quickAdd({
      mealType,
      date,
      calories: cals,
      proteinG: parseFloat(qaProtein) || 0,
      carbsG: parseFloat(qaCarbs) || 0,
      fatG: parseFloat(qaFat) || 0,
    });

    if (ok) {
      setQaCalories("");
      setQaProtein("");
      setQaCarbs("");
      setQaFat("");
      handleClose();
    }
  };

  const handleClose = useCallback(() => {
    setSelected(null);
    clearSearch();
    setActiveTab("search");
    onClose();
  }, [clearSearch, onClose]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-scale-in rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-elevated)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              Add to {MEAL_TYPE_LABELS[mealType]}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {date}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab("search")}
            className={cn(
              "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors",
              activeTab === "search"
                ? "border-[var(--color-brand-500)] text-[var(--color-brand-500)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab("myMeals")}
            className={cn(
              "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors",
              activeTab === "myMeals"
                ? "border-[var(--color-brand-500)] text-[var(--color-brand-500)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            My Meals
          </button>
          <button
            onClick={() => setActiveTab("quickAdd")}
            className={cn(
              "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-1",
              activeTab === "quickAdd"
                ? "border-[var(--color-brand-500)] text-[var(--color-brand-500)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <Zap className="h-4 w-4" /> Quick Add
          </button>
        </div>

        {activeTab === "search" && (
          <div className="px-5 py-4 flex-shrink-0 border-b border-[var(--color-border-subtle)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search foods (e.g. rice, eggs, paneer)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-500)] focus:outline-none transition-colors"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] animate-spin" />
              )}
            </div>
          </div>
        )}

        {/* Content — either search results OR quantity selector OR my meals */}
        <div className="flex-1 overflow-y-auto bg-[var(--color-surface-1)]">
          {activeTab === "myMeals" ? (
            <div className="p-4 space-y-3">
              {loadingMeals ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand-500)]" /></div>
              ) : savedMeals.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                  <Bookmark className="mx-auto h-8 w-8 text-[var(--color-text-disabled)] mb-3" />
                  No saved meals found. <br />
                  Log some foods in a meal and click &quot;Save as Meal&quot;.
                </div>
              ) : (
                <div className="space-y-3">
                  {savedMeals.map((meal) => (
                    <div key={meal.id} className="rounded-xl border border-[var(--color-border)] p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[var(--color-text-primary)]">{meal.name}</h4>
                        <button
                          onClick={() => handleLogSavedMeal(meal.id)}
                          disabled={addingMealId === meal.id}
                          className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-brand-500)] text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                        >
                          {addingMealId === meal.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          Add All
                        </button>
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                        {meal.items.map((item: any) => `${item.food.name} (${item.quantityG}${item.servingUnit})`).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "quickAdd" ? (
            <div className="p-5 space-y-5 animate-slide-up">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  Calories <span className="text-[var(--color-error-500)]">*</span>
                </label>
                <input
                  type="number"
                  value={qaCalories}
                  onChange={(e) => setQaCalories(e.target.value)}
                  placeholder="e.g., 500"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-xl font-bold text-[var(--color-text-primary)] placeholder:font-normal placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-calories)] focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={qaProtein}
                    onChange={(e) => setQaProtein(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-protein)] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={qaCarbs}
                    onChange={(e) => setQaCarbs(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-carbs)] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    value={qaFat}
                    onChange={(e) => setQaFat(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-fat)] focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <button
                onClick={handleQuickAddSubmit}
                disabled={adding || !qaCalories}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-500)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Quick Add Macros
              </button>
            </div>
          ) : selected ? (
            /* ── Quantity selector ── */
            <div className="px-5 py-2 space-y-4 animate-slide-up">
              {/* Selected food header */}
              <div className="rounded-xl border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/5 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">{selected.name}</p>
                    {selected.brand && (
                      <p className="text-xs text-[var(--color-text-muted)]">{selected.brand}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {selected.caloriesPer100g} kcal per 100g
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quantity + unit row */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  Quantity
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min={1}
                    max={5000}
                    className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none transition-colors"
                    placeholder="100"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ServingUnit)}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none transition-colors"
                  >
                    {SERVING_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick quantity buttons */}
              <div className="flex gap-2">
                {[50, 100, 150, 200].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q.toString())}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
                      quantity === q.toString()
                        ? "bg-[var(--color-brand-600)] text-white"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]",
                    )}
                  >
                    {q}g
                  </button>
                ))}
              </div>

              {/* Preview nutrition */}
              {preview && parseFloat(quantity) > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Calories", value: `${preview.calories}`, color: "var(--color-calories)", unit: "kcal" },
                    { label: "Protein", value: `${preview.proteinG}`, color: "var(--color-protein)", unit: "g" },
                    { label: "Carbs", value: `${preview.carbsG}`, color: "var(--color-carbs)", unit: "g" },
                    { label: "Fat", value: `${preview.fatG}`, color: "var(--color-fat)", unit: "g" },
                  ].map(({ label, value, color, unit: u }) => (
                    <div key={label} className="rounded-xl bg-[var(--color-surface-2)] px-2 py-2 text-center">
                      <p className="text-sm font-bold text-[var(--color-text-primary)]">{value}</p>
                      <p className="text-[10px] font-medium" style={{ color }}>{u}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add button */}
              <button
                onClick={handleAdd}
                disabled={adding || !quantity || parseFloat(quantity) < 1}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                  "bg-[var(--color-brand-600)] text-white",
                  "hover:bg-[var(--color-brand-500)] active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Add to {MEAL_TYPE_LABELS[mealType]}
              </button>
            </div>
          ) : (
            /* ── Search results ── */
            <div>
              {results.length === 0 && query.length > 0 && !searching && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No foods found for &quot;{query}&quot;
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-disabled)]">
                    Try a different search term
                  </p>
                </div>
              )}

              {results.length === 0 && query.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <Search className="mx-auto h-8 w-8 text-[var(--color-text-disabled)] mb-3" />
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Search for a food to get started
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-disabled)]">
                    Try: rice, eggs, chicken, paneer, oats...
                  </p>
                </div>
              )}

              <ul className="px-3 pb-3 space-y-1">
                {results.map((food) => (
                  <li key={food.id}>
                    <button
                      onClick={() => handleSelectFood(food)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-2)] group"
                    >
                      {/* Food info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {food.name}
                          </span>
                          {food.isVerified && (
                            <span className="flex-shrink-0 rounded-full bg-[var(--color-success-400)]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-success-400)]">
                              Verified
                            </span>
                          )}
                        </div>
                        {food.brand && (
                          <p className="text-xs text-[var(--color-text-muted)] truncate">{food.brand}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {food.caloriesPer100g} kcal
                          </span>
                          <span className="text-[10px] text-[var(--color-text-disabled)]">·</span>
                          <span className="text-xs" style={{ color: "var(--color-protein)" }}>
                            P {food.proteinPer100g}g
                          </span>
                          <span className="text-[10px] text-[var(--color-text-disabled)]">·</span>
                          <span className="text-xs" style={{ color: "var(--color-carbs)" }}>
                            C {food.carbsPer100g}g
                          </span>
                          <span className="text-[10px] text-[var(--color-text-disabled)]">·</span>
                          <span className="text-xs" style={{ color: "var(--color-fat)" }}>
                            F {food.fatPer100g}g
                          </span>
                          <span className="text-[10px] text-[var(--color-text-disabled)]">per 100g</span>
                        </div>
                      </div>
                      <Plus className="h-4 w-4 flex-shrink-0 text-[var(--color-text-disabled)] group-hover:text-[var(--color-brand-400)] transition-colors" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
