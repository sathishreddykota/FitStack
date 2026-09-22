import {
  ACTIVITY_MULTIPLIERS,
  GOAL_CALORIE_ADJUSTMENTS,
  PROTEIN_TARGETS_G_PER_KG,
  FAT_PERCENT_OF_CALORIES,
  CALORIES_PER_GRAM,
  WATER_TARGET_ML,
} from "@/lib/constants";
import type { ActivityLevel, FitnessGoal, Sex } from "@/types/user.types";
import type { MacroTargets } from "@/types/nutrition.types";

// ─────────────────────────────────────────────
// BMR Calculation (Mifflin-St Jeor)
// ─────────────────────────────────────────────

/**
 * Calculate Basal Metabolic Rate using the Mifflin-St Jeor equation.
 *
 * Note: BMR is an estimate of calories burned at complete rest.
 * Real calorie needs vary by individual. Use results as a starting point.
 *
 * @param weightKg  - Current body weight in kg
 * @param heightCm  - Height in cm
 * @param age       - Age in years
 * @param sex       - Biological sex (MALE | FEMALE | OTHER)
 * @returns Estimated BMR in kcal/day
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
): number {
  // Mifflin-St Jeor
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (sex === "MALE") {
    return base + 5;
  } else if (sex === "FEMALE") {
    return base - 161;
  } else {
    // For OTHER, use the average of male/female
    return base - 78;
  }
}

// ─────────────────────────────────────────────
// TDEE Calculation
// ─────────────────────────────────────────────

/**
 * Calculate Total Daily Energy Expenditure (TDEE).
 * Multiply BMR by the activity factor.
 *
 * @param bmr           - Basal Metabolic Rate
 * @param activityLevel - Activity level enum
 * @returns Estimated TDEE in kcal/day
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  return Math.round(bmr * multiplier);
}

// ─────────────────────────────────────────────
// Daily Calorie Target
// ─────────────────────────────────────────────

/**
 * Calculate the recommended daily calorie target based on TDEE and goal.
 * A surplus is added for muscle gain, a deficit for fat loss.
 *
 * These are evidence-informed estimates and should be treated as a starting
 * point. Individual metabolism varies — users should adjust based on their
 * actual progress over 2-4 weeks.
 *
 * @param tdee  - Total Daily Energy Expenditure
 * @param goal  - Fitness goal
 * @returns Recommended daily calorie target
 */
export function calculateDailyCalorieTarget(tdee: number, goal: FitnessGoal): number {
  const adjustment = GOAL_CALORIE_ADJUSTMENTS[goal];
  return Math.max(1200, Math.round(tdee + adjustment)); // floor at 1200 kcal
}

// ─────────────────────────────────────────────
// Macro Targets
// ─────────────────────────────────────────────

/**
 * Calculate daily macro targets given calorie target, goal, and bodyweight.
 *
 * Priority order:
 *  1. Protein set by g/kg of bodyweight (goal-specific)
 *  2. Fat set as % of total calories (floor to avoid hormonal issues)
 *  3. Carbs fill the remaining calories
 *
 * @param calorieTarget  - Daily calorie target in kcal
 * @param bodyweightKg   - Current bodyweight in kg
 * @param goal           - Fitness goal
 * @returns MacroTargets object with protein, carbs, fat in grams
 */
export function calculateMacroTargets(
  calorieTarget: number,
  bodyweightKg: number,
  goal: FitnessGoal,
): MacroTargets {
  const proteinGPerKg = PROTEIN_TARGETS_G_PER_KG[goal];
  const fatPercent = FAT_PERCENT_OF_CALORIES[goal];

  // 1. Protein (g)
  const proteinG = Math.round(proteinGPerKg * bodyweightKg);

  // 2. Fat (g)
  const fatCalories = Math.round(calorieTarget * fatPercent);
  const fatG = Math.round(fatCalories / CALORIES_PER_GRAM.FAT);

  // 3. Carbs fill remaining calories
  const proteinCalories = proteinG * CALORIES_PER_GRAM.PROTEIN;
  const remainingCalories = calorieTarget - proteinCalories - fatCalories;
  const carbsG = Math.max(0, Math.round(remainingCalories / CALORIES_PER_GRAM.CARBS));

  return {
    calories: calorieTarget,
    proteinG,
    carbsG,
    fatG,
  };
}

// ─────────────────────────────────────────────
// Full Calculation Pipeline
// ─────────────────────────────────────────────

export interface CalorieEngineInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
}

export interface CalorieEngineOutput {
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  macros: MacroTargets;
  waterTargetMl: number;
}

/**
 * Run the full calorie/macro engine.
 * All calculations use the Mifflin-St Jeor + activity factor approach.
 *
 * IMPORTANT: Results are estimates for general guidance only.
 * Not medical advice. Users should monitor actual progress and adjust.
 */
export function runCalorieEngine(input: CalorieEngineInput): CalorieEngineOutput {
  const bmr = calculateBMR(input.weightKg, input.heightCm, input.age, input.sex);
  const tdee = calculateTDEE(bmr, input.activityLevel);
  const dailyCalorieTarget = calculateDailyCalorieTarget(tdee, input.goal);
  const macros = calculateMacroTargets(dailyCalorieTarget, input.weightKg, input.goal);
  const waterTargetMl = WATER_TARGET_ML[input.activityLevel];

  return {
    bmr: Math.round(bmr),
    tdee,
    dailyCalorieTarget,
    macros,
    waterTargetMl,
  };
}

// ─────────────────────────────────────────────
// 1RM Estimation (Brzycki Formula)
// ─────────────────────────────────────────────

/**
 * Estimate 1 Rep Max using the Brzycki formula.
 * Accurate for 1-12 rep range. Less accurate for very high reps.
 *
 * 1RM = weight × (36 / (37 - reps))
 *
 * @param weightKg - Weight lifted
 * @param reps     - Repetitions performed
 * @returns Estimated 1RM in kg
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  if (reps > 30) {
    // Brzycki is unreliable at very high reps; use Epley instead
    return Math.round(weightKg * (1 + reps / 30));
  }
  return Math.round(weightKg * (36 / (37 - reps)));
}

/**
 * Calculate total training volume for a set of sets.
 * Volume = Σ (weight × reps)
 */
export function calculateVolume(
  sets: Array<{ weightKg: number | null; reps: number | null }>,
): number {
  return sets.reduce((total, set) => {
    if (!set.weightKg || !set.reps) return total;
    return total + set.weightKg * set.reps;
  }, 0);
}

// ─────────────────────────────────────────────
// Food Nutrition Calculations
// ─────────────────────────────────────────────

/**
 * Calculate nutritional values for a given quantity of a food.
 * All per100g values are scaled to the actual quantity.
 *
 * @param quantityG       - Quantity in grams
 * @param caloriesPer100g - Calories per 100g
 * @param proteinPer100g  - Protein per 100g
 * @param carbsPer100g    - Carbs per 100g
 * @param fatPer100g      - Fat per 100g
 * @param fiberPer100g    - Fiber per 100g (optional)
 */
export function calculateFoodNutrition(
  quantityG: number,
  caloriesPer100g: number,
  proteinPer100g: number,
  carbsPer100g: number,
  fatPer100g: number,
  fiberPer100g: number | null = null,
) {
  const factor = quantityG / 100;
  return {
    calories: Math.round(caloriesPer100g * factor * 10) / 10,
    proteinG: Math.round(proteinPer100g * factor * 10) / 10,
    carbsG: Math.round(carbsPer100g * factor * 10) / 10,
    fatG: Math.round(fatPer100g * factor * 10) / 10,
    fiberG: fiberPer100g !== null ? Math.round(fiberPer100g * factor * 10) / 10 : null,
  };
}

/**
 * Sum nutrition across an array of food items.
 */
export function sumNutrition(
  items: Array<{
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number | null;
  }>,
) {
  return items.reduce(
    (totals, item) => ({
      calories: totals.calories + item.calories,
      proteinG: totals.proteinG + item.proteinG,
      carbsG: totals.carbsG + item.carbsG,
      fatG: totals.fatG + item.fatG,
      fiberG: (totals.fiberG ?? 0) + (item.fiberG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 as number },
  );
}

// ─────────────────────────────────────────────
// 7-Day Weight Average
// ─────────────────────────────────────────────

/**
 * Calculate a 7-day rolling average of body weights.
 * More stable than daily readings for tracking trends.
 */
export function sevenDayWeightAverage(
  logs: Array<{ date: Date; weightKg: number }>,
): Array<{ date: Date; weightKg: number; average: number }> {
  const sorted = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());

  return sorted.map((log, i) => {
    const start = Math.max(0, i - 6);
    const window = sorted.slice(start, i + 1);
    const average = window.reduce((sum, l) => sum + l.weightKg, 0) / window.length;
    return {
      date: log.date,
      weightKg: log.weightKg,
      average: Math.round(average * 10) / 10,
    };
  });
}
