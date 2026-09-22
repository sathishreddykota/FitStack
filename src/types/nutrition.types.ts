// ─────────────────────────────────────────────
// Nutrition Types
// ─────────────────────────────────────────────

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "PRE_WORKOUT" | "POST_WORKOUT";

export type FoodCategory =
  | "GRAINS_CEREALS"
  | "LEGUMES_PULSES"
  | "DAIRY"
  | "MEAT_POULTRY"
  | "SEAFOOD"
  | "EGGS"
  | "VEGETABLES"
  | "FRUITS"
  | "NUTS_SEEDS"
  | "FATS_OILS"
  | "BEVERAGES"
  | "SUPPLEMENTS"
  | "SNACKS"
  | "SWEETS"
  | "CONDIMENTS"
  | "FAST_FOOD"
  | "OTHER";

export type ServingUnit =
  | "g"
  | "kg"
  | "ml"
  | "L"
  | "cup"
  | "tbsp"
  | "tsp"
  | "piece"
  | "slice"
  | "serving"
  | "scoop";

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  category: FoodCategory;
  // Macros per 100g
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  // Default serving
  defaultServingSizeG: number;
  defaultServingUnit: ServingUnit;
  isVerified: boolean;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealItem {
  id: string;
  mealId: string;
  foodId: string;
  food: Food;
  quantityG: number;
  servingUnit: ServingUnit;
  // Calculated at log time
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  notes: string | null;
}

export interface Meal {
  id: string;
  userId: string;
  date: Date;
  mealType: MealType;
  items: MealItem[];
  // Calculated totals
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyNutrition {
  date: Date;
  meals: Meal[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  // Targets
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionSummary {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface FoodSearchResult {
  id: string;
  name: string;
  brand: string | null;
  category: FoodCategory;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  defaultServingSizeG: number;
  defaultServingUnit: ServingUnit;
  isVerified: boolean;
  createdByUserId: string | null;
}

export interface AddFoodToMealInput {
  foodId: string;
  mealType: MealType;
  date: Date;
  quantityG: number;
  servingUnit: ServingUnit;
  notes?: string;
}
