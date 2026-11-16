import { z } from "zod";
import { dateStringSchema } from "../dates";

export const planInputSchema = z.object({
  goal: z.enum(["GAIN_MUSCLE", "LOSE_FAT", "MAINTAIN", "RECOMPOSITION", "GENERAL_FITNESS"]),
  style: z.enum(["HYBRID_STRENGTH", "HYPERTROPHY", "STRENGTH", "GENERAL_FITNESS", "RUNNING_STRENGTH"]),
  experience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  daysPerWeek: z.number().int().min(2).max(7),
  equipment: z.enum(["GYM", "DUMBBELLS", "BODYWEIGHT"]).default("GYM"),
});

export const sessionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("START") }),
  z.object({ action: z.literal("COMPLETE"), notes: z.string().max(500).optional() }),
  z.object({ action: z.literal("SKIP"), reason: z.string().max(200).optional() }),
  z.object({ action: z.literal("UNSKIP") }),
  z.object({ action: z.literal("RESCHEDULE"), newDate: dateStringSchema }),
  z.object({ action: z.literal("RENAME"), name: z.string().trim().min(1).max(60) }),
]);

export const setPatchSchema = z.object({
  weightKg: z.number().min(0).max(1000).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  setType: z.enum(["WORKING", "WARMUP", "DROP_SET", "FAILURE", "AMRAP"]).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).nullable().optional(),
  distanceM: z.number().min(0).max(500_000).nullable().optional(),
  completed: z.boolean().optional(),
});

export const createSessionSchema = z.object({
  date: dateStringSchema.optional(),
  name: z.string().trim().max(60).optional(),
  start: z.boolean().default(true),
});

export const addExerciseSchema = z.object({
  exerciseId: z.string().min(1).max(64),
  sets: z.number().int().min(1).max(10).default(3),
});

export const magicLogSchema = z.object({ text: z.string().trim().min(3).max(800) });
