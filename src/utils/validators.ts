import { z } from "zod";
import type { Sex, ActivityLevel, FitnessGoal, TrainingStyle, TrainingExperience, CardioPreference, DietaryPreference } from "@/types/user.types";

// ─────────────────────────────────────────────
// Onboarding Schema
// ─────────────────────────────────────────────

export const onboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  age: z
    .number({ invalid_type_error: "Age must be a number" })
    .int()
    .min(13, "Must be at least 13 years old")
    .max(100, "Please enter a valid age"),
  sex: z.enum(["MALE", "FEMALE", "OTHER"] as [Sex, ...Sex[]], {
    required_error: "Please select your sex",
  }),
  heightCm: z
    .number({ invalid_type_error: "Height must be a number" })
    .min(100, "Please enter a valid height")
    .max(250, "Please enter a valid height"),
  currentWeightKg: z
    .number({ invalid_type_error: "Weight must be a number" })
    .min(30, "Please enter a valid weight")
    .max(300, "Please enter a valid weight"),
  targetWeightKg: z
    .number({ invalid_type_error: "Target weight must be a number" })
    .min(30, "Please enter a valid target weight")
    .max(300, "Please enter a valid target weight"),
  fitnessGoal: z.enum(
    ["GAIN_MUSCLE", "LOSE_FAT", "MAINTAIN", "RECOMPOSITION", "GENERAL_FITNESS"] as [
      FitnessGoal,
      ...FitnessGoal[],
    ],
    { required_error: "Please select your fitness goal" },
  ),
  activityLevel: z.enum(
    [
      "SEDENTARY",
      "LIGHTLY_ACTIVE",
      "MODERATELY_ACTIVE",
      "VERY_ACTIVE",
      "EXTRA_ACTIVE",
    ] as [ActivityLevel, ...ActivityLevel[]],
    { required_error: "Please select your activity level" },
  ),
  trainingExperience: z.enum(
    ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as [
      TrainingExperience,
      ...TrainingExperience[],
    ],
    { required_error: "Please select your experience level" },
  ),
  trainingDaysPerWeek: z
    .number()
    .int()
    .min(1, "Minimum 1 day")
    .max(7, "Maximum 7 days"),
  trainingStyle: z.enum(
    [
      "HYBRID_STRENGTH",
      "HYPERTROPHY",
      "STRENGTH",
      "GENERAL_FITNESS",
      "RUNNING_STRENGTH",
    ] as [TrainingStyle, ...TrainingStyle[]],
    { required_error: "Please select your training style" },
  ),
  cardioPreference: z.enum(
    ["NONE", "LIGHT", "MODERATE", "HEAVY"] as [CardioPreference, ...CardioPreference[]],
    { required_error: "Please select your cardio preference" },
  ),
  dietaryPreference: z.enum(
    [
      "NO_PREFERENCE",
      "VEGETARIAN",
      "VEGAN",
      "PESCATARIAN",
      "KETO",
      "HIGH_PROTEIN",
    ] as [DietaryPreference, ...DietaryPreference[]],
    { required_error: "Please select your dietary preference" },
  ),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

// ─────────────────────────────────────────────
// Food Log Schema
// ─────────────────────────────────────────────

export const addFoodToMealSchema = z.object({
  foodId: z.string().min(1, "Food is required"),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "PRE_WORKOUT", "POST_WORKOUT"]),
  date: z.date(),
  quantityG: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .min(1, "Quantity must be at least 1g")
    .max(5000, "Quantity seems too large — please check"),
  servingUnit: z.enum(["g", "kg", "ml", "L", "cup", "tbsp", "tsp", "piece", "slice", "serving", "scoop"]),
  notes: z.string().max(500).optional(),
});

export type AddFoodToMealFormData = z.infer<typeof addFoodToMealSchema>;

// ─────────────────────────────────────────────
// Weight Log Schema
// ─────────────────────────────────────────────

export const weightLogSchema = z.object({
  date: z.date(),
  weightKg: z
    .number({ invalid_type_error: "Weight must be a number" })
    .min(20, "Weight seems too low — please check")
    .max(400, "Weight seems too high — please check"),
  bodyFatPercent: z
    .number()
    .min(1)
    .max(70)
    .optional()
    .nullable(),
  notes: z.string().max(500).optional(),
});

export type WeightLogFormData = z.infer<typeof weightLogSchema>;

// ─────────────────────────────────────────────
// Water Log Schema
// ─────────────────────────────────────────────

export const waterLogSchema = z.object({
  date: z.date(),
  amountMl: z
    .number({ invalid_type_error: "Amount must be a number" })
    .min(50, "Amount must be at least 50ml")
    .max(5000, "Please enter a realistic amount"),
});

export type WaterLogFormData = z.infer<typeof waterLogSchema>;

// ─────────────────────────────────────────────
// Workout Set Schema
// ─────────────────────────────────────────────

export const workoutSetSchema = z.object({
  setNumber: z.number().int().min(1),
  setType: z.enum(["WORKING", "WARMUP", "DROP_SET", "FAILURE", "AMRAP"]),
  weightKg: z.number().min(0).max(1000).optional().nullable(),
  reps: z.number().int().min(0).max(9999).optional().nullable(),
  durationSeconds: z.number().int().min(0).optional().nullable(),
  distanceM: z.number().min(0).optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  restSeconds: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional(),
});

export type WorkoutSetFormData = z.infer<typeof workoutSetSchema>;

// ─────────────────────────────────────────────
// Body Measurement Schema
// ─────────────────────────────────────────────

export const bodyMeasurementSchema = z.object({
  date: z.date(),
  chestCm: z.number().min(0).max(300).optional().nullable(),
  waistCm: z.number().min(0).max(300).optional().nullable(),
  hipsCm: z.number().min(0).max(300).optional().nullable(),
  neckCm: z.number().min(0).max(200).optional().nullable(),
  leftArmCm: z.number().min(0).max(200).optional().nullable(),
  rightArmCm: z.number().min(0).max(200).optional().nullable(),
  leftThighCm: z.number().min(0).max(200).optional().nullable(),
  rightThighCm: z.number().min(0).max(200).optional().nullable(),
  leftCalfCm: z.number().min(0).max(200).optional().nullable(),
  rightCalfCm: z.number().min(0).max(200).optional().nullable(),
  shouldersCm: z.number().min(0).max(300).optional().nullable(),
  notes: z.string().max(500).optional(),
});

export type BodyMeasurementFormData = z.infer<typeof bodyMeasurementSchema>;

// ─────────────────────────────────────────────
// Sleep Log Schema
// ─────────────────────────────────────────────

export const sleepLogSchema = z.object({
  date: z.date(),
  durationMinutes: z
    .number()
    .int()
    .min(0)
    .max(1440)
    .optional()
    .nullable(),
  quality: z.enum(["POOR", "FAIR", "GOOD", "EXCELLENT"]).optional().nullable(),
  notes: z.string().max(500).optional(),
});

export type SleepLogFormData = z.infer<typeof sleepLogSchema>;

// ─────────────────────────────────────────────
// Profile Settings Schema
// ─────────────────────────────────────────────

export const profileSettingsSchema = z.object({
  name: z.string().min(1).max(100),
  caloriesToOverride: z.number().int().min(1000).max(10000).optional().nullable(),
  dailyProteinTargetG: z.number().int().min(0).max(500).optional().nullable(),
  dailyCarbsTargetG: z.number().int().min(0).max(1000).optional().nullable(),
  dailyFatTargetG: z.number().int().min(0).max(500).optional().nullable(),
  dailyWaterTargetL: z.number().min(0.5).max(10).optional().nullable(),
});

export type ProfileSettingsFormData = z.infer<typeof profileSettingsSchema>;
