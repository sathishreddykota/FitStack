import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runCalorieEngine } from "@/utils/calculations";

export async function PUT(req: NextRequest) {
  try {
    const userId = await getInternalUserId();
    const data = await req.json();

    // Re-run the calorie engine based on new inputs
    const engineResult = runCalorieEngine({
      age: data.age,
      sex: data.sex,
      heightCm: data.heightCm,
      weightKg: data.currentWeightKg,
      activityLevel: data.activityLevel,
      goal: data.fitnessGoal,
    });

    const updatedProfile = await prisma.fitnessProfile.update({
      where: { userId },
      data: {
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
        dietaryPreference: data.dietaryPreference,

        // Update the calculated targets
        dailyCalorieTarget: engineResult.dailyCalorieTarget,
        dailyProteinTargetG: engineResult.macros.proteinG,
        dailyCarbsTargetG: engineResult.macros.carbsG,
        dailyFatTargetG: engineResult.macros.fatG,
        dailyWaterTargetL: engineResult.waterTargetMl / 1000,
      },
    });

    // Automatically sync the new weight to today's WeightLog
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Store as midnight to align with @db.Date 

    await prisma.weightLog.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        weightKg: data.currentWeightKg,
      },
      create: {
        userId,
        date: today,
        weightKg: data.currentWeightKg,
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error("[PUT /api/user/profile]", error);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}
