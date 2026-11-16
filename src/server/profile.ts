import "server-only";
import { z } from "zod";
import type { FitnessProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/utils/validators";
import { calculateMacroTargets, runCalorieEngine } from "@/utils/calculations";
import { badRequest } from "./http";
import { isValidTimezone, safeTimezone, toDbDate, userToday } from "./dates";

// ─────────────────────────────────────────────
// Onboarding + profile updates. Targets are always recomputed on the server.
// ─────────────────────────────────────────────

const timezoneSchema = z.string().max(64).refine(isValidTimezone, { message: "Unknown timezone" });

export const onboardingRequestSchema = onboardingSchema.extend({ timezone: timezoneSchema.optional() });

export const profileUpdateSchema = onboardingSchema
  .omit({ name: true })
  .partial()
  .extend({
    name: z.string().trim().min(1).max(100).optional(),
    timezone: timezoneSchema.optional(),
    /** Manual calorie target; null clears it and goes back to the calculated value. */
    caloriesToOverride: z.number().int().min(1000).max(6000).nullable().optional(),
  });

type Inputs = z.infer<typeof onboardingSchema>;

function computeTargets(p: Omit<Inputs, "name">, override?: number | null) {
  const engine = runCalorieEngine({
    weightKg: p.currentWeightKg,
    heightCm: p.heightCm,
    age: p.age,
    sex: p.sex,
    activityLevel: p.activityLevel,
    goal: p.fitnessGoal,
  });
  const calories = override ?? engine.dailyCalorieTarget;
  const macros = override ? calculateMacroTargets(override, p.currentWeightKg, p.fitnessGoal) : engine.macros;
  return {
    dailyCalorieTarget: calories,
    dailyProteinTargetG: macros.proteinG,
    dailyCarbsTargetG: macros.carbsG,
    dailyFatTargetG: macros.fatG,
    dailyWaterTargetL: engine.waterTargetMl / 1000,
  };
}

export async function completeOnboarding(userId: string, input: z.infer<typeof onboardingRequestSchema>) {
  const { name, timezone, ...p } = input;
  const tz = safeTimezone(timezone);
  const data = { ...p, timezone: tz, ...computeTargets(p) };
  const today = userToday(tz).db;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { name, onboardingComplete: true } }),
    prisma.fitnessProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data }),
    // Starting weigh-in, so progress charts have a first point.
    prisma.weightLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, weightKg: p.currentWeightKg },
      update: { weightKg: p.currentWeightKg },
    }),
  ]);
}

/** Fill a partial update with existing values; reject if required fields are still missing. */
function merge(existing: FitnessProfile, patch: z.infer<typeof profileUpdateSchema>): Omit<Inputs, "name"> {
  const merged = {
    age: patch.age ?? existing.age,
    sex: patch.sex ?? existing.sex,
    heightCm: patch.heightCm ?? existing.heightCm,
    currentWeightKg: patch.currentWeightKg ?? existing.currentWeightKg,
    targetWeightKg: patch.targetWeightKg ?? existing.targetWeightKg,
    fitnessGoal: patch.fitnessGoal ?? existing.fitnessGoal,
    activityLevel: patch.activityLevel ?? existing.activityLevel,
    trainingExperience: patch.trainingExperience ?? existing.trainingExperience,
    trainingDaysPerWeek: patch.trainingDaysPerWeek ?? existing.trainingDaysPerWeek,
    trainingStyle: patch.trainingStyle ?? existing.trainingStyle,
    cardioPreference: patch.cardioPreference ?? existing.cardioPreference,
    dietaryPreference: patch.dietaryPreference ?? existing.dietaryPreference,
  };
  const parsed = onboardingSchema.omit({ name: true }).safeParse(merged);
  if (!parsed.success) throw badRequest("Profile is incomplete.", parsed.error.flatten());
  return parsed.data;
}

export async function updateProfile(userId: string, patch: z.infer<typeof profileUpdateSchema>) {
  const existing = await prisma.fitnessProfile.findUnique({ where: { userId } });
  if (!existing) throw badRequest("Finish onboarding first.");

  const p = merge(existing, patch);
  const override = patch.caloriesToOverride === undefined ? existing.caloriesToOverride : patch.caloriesToOverride;
  const tz = safeTimezone(patch.timezone ?? existing.timezone);

  const profile = await prisma.fitnessProfile.update({
    where: { userId },
    data: { ...p, timezone: tz, caloriesToOverride: override, ...computeTargets(p, override) },
  });
  if (patch.name) await prisma.user.update({ where: { id: userId }, data: { name: patch.name } });

  // A changed current weight is also today's weigh-in.
  if (patch.currentWeightKg !== undefined && patch.currentWeightKg !== existing.currentWeightKg) {
    const today = toDbDate(userToday(tz).str);
    await prisma.weightLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, weightKg: patch.currentWeightKg },
      update: { weightKg: patch.currentWeightKg },
    });
  }
  return profile;
}
