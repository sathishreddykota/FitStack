import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/auth";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your physical metrics and fitness goals.",
};

export default async function ProfilePage() {
  const user = await requireOnboardedUser();
  const p = user.profile;
  return (
    <ProfileClient
      user={{ name: user.name ?? "", email: user.email, avatarUrl: user.avatarUrl }}
      profile={{
        age: p.age ?? 25,
        sex: p.sex ?? "MALE",
        heightCm: p.heightCm ?? 170,
        currentWeightKg: p.currentWeightKg ?? 70,
        targetWeightKg: p.targetWeightKg ?? 70,
        activityLevel: p.activityLevel ?? "MODERATELY_ACTIVE",
        fitnessGoal: p.fitnessGoal ?? "GENERAL_FITNESS",
        trainingStyle: p.trainingStyle ?? "HYBRID_STRENGTH",
        trainingExperience: p.trainingExperience ?? "BEGINNER",
        trainingDaysPerWeek: p.trainingDaysPerWeek ?? 4,
        cardioPreference: p.cardioPreference ?? "LIGHT",
        dietaryPreference: p.dietaryPreference ?? "NO_PREFERENCE",
        timezone: p.timezone,
        caloriesToOverride: p.caloriesToOverride,
      }}
      targets={{
        calories: p.dailyCalorieTarget,
        proteinG: p.dailyProteinTargetG,
        carbsG: p.dailyCarbsTargetG,
        fatG: p.dailyFatTargetG,
        waterL: p.dailyWaterTargetL,
      }}
    />
  );
}
