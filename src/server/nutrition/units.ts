import type { ServingUnit } from "@prisma/client";

// ─────────────────────────────────────────────
// Serving unit → grams (pure, unit tested).
//
// Priority:
//   1. A food-specific size (FoodServing row, e.g. 1 piece dosa = 150 g)
//   2. Mass units (g, kg) — exact
//   3. Volume units (ml, L, cup, tbsp, tsp) — via density 1 g/ml (good for
//      water, milk, dal, curries; slightly off for oils/flours)
//   4. Count units (piece, slice, serving, scoop) — the food's default serving
// ─────────────────────────────────────────────

export const ALL_UNITS: ServingUnit[] = ["g", "kg", "ml", "L", "cup", "tbsp", "tsp", "piece", "slice", "serving", "scoop"];

const MASS_G: Partial<Record<ServingUnit, number>> = { g: 1, kg: 1000 };
const VOLUME_ML: Partial<Record<ServingUnit, number>> = { ml: 1, L: 1000, cup: 240, tbsp: 15, tsp: 5 };
const COUNT_UNITS: ServingUnit[] = ["piece", "slice", "serving", "scoop"];

/** Fallback grams for one scoop when a food has no explicit scoop size (protein powder). */
const DEFAULT_SCOOP_G = 30;

export interface UnitFood {
  defaultServingSizeG: number;
  defaultServingUnit: ServingUnit;
  servings?: { unit: ServingUnit; grams: number }[];
}

/** Grams in ONE `unit` of this food. */
export function gramsPerUnit(food: UnitFood, unit: ServingUnit): number {
  const specific = food.servings?.find((s) => s.unit === unit);
  if (specific && specific.grams > 0) return specific.grams;

  const mass = MASS_G[unit];
  if (mass) return mass;

  const ml = VOLUME_ML[unit];
  if (ml) return ml; // density ≈ 1 g/ml

  if (COUNT_UNITS.includes(unit)) {
    // The food's default serving is expressed in a count unit → that's one unit.
    if (COUNT_UNITS.includes(food.defaultServingUnit) && food.defaultServingSizeG > 0) {
      return food.defaultServingSizeG;
    }
    if (unit === "scoop") return DEFAULT_SCOOP_G;
    return food.defaultServingSizeG > 0 ? food.defaultServingSizeG : 100;
  }
  return 1;
}

export function toGrams(food: UnitFood, quantity: number, unit: ServingUnit): number {
  return round1(quantity * gramsPerUnit(food, unit));
}

export interface Per100g {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
}

/** Nutrition snapshot for `grams` of a food. */
export function nutritionFor(food: Per100g, grams: number) {
  const f = grams / 100;
  return {
    calories: round1(food.caloriesPer100g * f),
    proteinG: round1(food.proteinPer100g * f),
    carbsG: round1(food.carbsPer100g * f),
    fatG: round1(food.fatPer100g * f),
    fiberG: food.fiberPer100g == null ? null : round1(food.fiberPer100g * f),
  };
}

/** Units that make sense to offer for a food, most natural first. */
export function suggestedUnits(food: UnitFood): ServingUnit[] {
  const units = new Set<ServingUnit>();
  for (const s of food.servings ?? []) units.add(s.unit);
  if (COUNT_UNITS.includes(food.defaultServingUnit)) units.add(food.defaultServingUnit);
  units.add("g");
  if (food.defaultServingUnit === "ml" || food.defaultServingUnit === "L") units.add("ml");
  units.add("serving");
  return [...units];
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
