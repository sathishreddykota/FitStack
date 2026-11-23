import { z } from "zod";
import { dateStringSchema } from "./dates";
import { ALL_UNITS } from "./nutrition/units";

// Shared request schemas (used by API routes; safe to import on the client too).

export const mealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "PRE_WORKOUT", "POST_WORKOUT"]);
export const unitSchema = z.enum(ALL_UNITS as [(typeof ALL_UNITS)[number], ...(typeof ALL_UNITS)[number][]]);
export const idSchema = z.string().min(1).max(64);

export const logFoodSchema = z.object({
  foodId: idSchema,
  mealType: mealTypeSchema,
  date: dateStringSchema,
  quantity: z.number().positive().max(10_000),
  unit: unitSchema.default("g"),
  notes: z.string().max(300).optional(),
});

export const updateMealItemSchema = z.object({
  quantity: z.number().positive().max(10_000),
  unit: unitSchema,
  notes: z.string().max(300).optional(),
});

export const quickAddSchema = z.object({
  mealType: mealTypeSchema,
  date: dateStringSchema,
  calories: z.number().min(0).max(10_000),
  proteinG: z.number().min(0).max(1000).default(0),
  carbsG: z.number().min(0).max(2000).default(0),
  fatG: z.number().min(0).max(1000).default(0),
  label: z.string().max(80).optional(),
});

export const aiFoodLogSchema = z.object({
  text: z.string().trim().min(2).max(600),
  mealType: mealTypeSchema,
  date: dateStringSchema,
});

export const savedMealSchema = z.union([
  z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().max(300).optional(),
    items: z
      .array(z.object({ foodId: idSchema, quantity: z.number().positive().max(10_000), unit: unitSchema }))
      .min(1)
      .max(40),
  }),
  // Save what's already logged for a meal
  z.object({ name: z.string().trim().min(1).max(80), fromLog: z.object({ date: dateStringSchema, mealType: mealTypeSchema }) }),
]);

export const logSavedMealSchema = z.object({ date: dateStringSchema, mealType: mealTypeSchema });

export const customFoodSchema = z.object({
  name: z.string().trim().min(1).max(80),
  brand: z.string().trim().max(60).optional(),
  caloriesPer100g: z.number().min(0).max(900),
  proteinPer100g: z.number().min(0).max(100),
  carbsPer100g: z.number().min(0).max(100),
  fatPer100g: z.number().min(0).max(100),
  fiberPer100g: z.number().min(0).max(100).nullable().optional(),
  defaultServingSizeG: z.number().positive().max(2000).optional(),
  defaultServingUnit: unitSchema.optional(),
});

export const waterLogSchema = z.object({
  amountMl: z.number().int().min(10).max(5000),
  date: dateStringSchema.optional(),
});

export const weightLogSchema = z.object({
  weightKg: z.number().min(20).max(400),
  bodyFatPercent: z.number().min(1).max(70).nullable().optional(),
  date: dateStringSchema.optional(),
  notes: z.string().max(300).optional(),
});

export const sleepLogSchema = z.object({
  date: dateStringSchema.optional(),
  durationMinutes: z.number().int().min(0).max(1440),
  quality: z.enum(["POOR", "FAIR", "GOOD", "EXCELLENT"]).optional(),
  notes: z.string().max(300).optional(),
});

const scale5 = z.number().int().min(1).max(5);
export const habitLogSchema = z.object({
  date: dateStringSchema.optional(),
  mood: scale5.optional(),
  energyLevel: scale5.optional(),
  sorenessLevel: scale5.optional(),
  stepCount: z.number().int().min(0).max(100_000).optional(),
  notes: z.string().max(300).optional(),
});
