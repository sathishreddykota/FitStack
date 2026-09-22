import { NextRequest, NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/utils/validators";
import { runCalorieEngine } from "@/utils/calculations";
import type { ApiResponse } from "@/types/api.types";

// ─────────────────────────────────────────────
// POST /api/onboarding
// ─────────────────────────────────────────────
// Persists onboarding data and calculated targets to the DB.

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<{ redirectTo: string }>>> {
  try {
    const user = await getRequiredUser();
    const body = await req.json();

    // Validate input
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid onboarding data",
          details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Run calorie/macro engine
    const engine = runCalorieEngine({
      weightKg: data.currentWeightKg,
      heightCm: data.heightCm,
      age: data.age,
      sex: data.sex,
      activityLevel: data.activityLevel,
      goal: data.fitnessGoal,
    });

    // Persist profile and mark onboarding complete in a transaction
    await prisma.$transaction([
      // Update user name
      prisma.user.update({
        where: { id: user.id },
        data: {
          name: data.name,
          onboardingComplete: true,
        },
      }),

      // Upsert fitness profile
      prisma.fitnessProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          age: data.age,
          sex: data.sex,
          heightCm: data.heightCm,
          currentWeightKg: data.currentWeightKg,
          targetWeightKg: data.targetWeightKg,
          activityLevel: data.activityLevel,
          fitnessGoal: data.fitnessGoal,
          trainingStyle: data.trainingStyle,
          trainingExperience: data.trainingExperience,
          trainingDaysPerWeek: data.trainingDaysPerWeek,
          cardioPreference: data.cardioPreference,
          dietaryPreference: data.dietaryPreference,
          // Calculated targets
          dailyCalorieTarget: engine.dailyCalorieTarget,
          dailyProteinTargetG: engine.macros.proteinG,
          dailyCarbsTargetG: engine.macros.carbsG,
          dailyFatTargetG: engine.macros.fatG,
          dailyWaterTargetL: engine.waterTargetMl / 1000,
        },
        update: {
          age: data.age,
          sex: data.sex,
          heightCm: data.heightCm,
          currentWeightKg: data.currentWeightKg,
          targetWeightKg: data.targetWeightKg,
          activityLevel: data.activityLevel,
          fitnessGoal: data.fitnessGoal,
          trainingStyle: data.trainingStyle,
          trainingExperience: data.trainingExperience,
          trainingDaysPerWeek: data.trainingDaysPerWeek,
          cardioPreference: data.cardioPreference,
          dietaryPreference: data.dietaryPreference,
          // Recalculate targets
          dailyCalorieTarget: engine.dailyCalorieTarget,
          dailyProteinTargetG: engine.macros.proteinG,
          dailyCarbsTargetG: engine.macros.carbsG,
          dailyFatTargetG: engine.macros.fatG,
          dailyWaterTargetL: engine.waterTargetMl / 1000,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { redirectTo: "/dashboard" },
      message: "Onboarding complete! Welcome to FitStack.",
    });
  } catch (error) {
    console.error("[POST /api/onboarding]", error);
    return NextResponse.json(
      { success: false, error: "Failed to save onboarding data. Please try again." },
      { status: 500 },
    );
  }
}
