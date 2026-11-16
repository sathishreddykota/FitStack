import type { Metadata } from "next";
import { entitlementOf, requireOnboardedUser } from "@/server/auth";
import { PlanGeneratorClient } from "./plan-client";

export const metadata: Metadata = { title: "New Training Plan" };

export default async function NewPlanPage() {
  const user = await requireOnboardedUser();
  const p = user.profile;
  return (
    <PlanGeneratorClient
      isPro={entitlementOf(user).isPro}
      defaults={{
        goal: p.fitnessGoal ?? "GAIN_MUSCLE",
        style: p.trainingStyle ?? "HYBRID_STRENGTH",
        experience: p.trainingExperience ?? "BEGINNER",
        daysPerWeek: Math.min(7, Math.max(2, p.trainingDaysPerWeek ?? 4)),
        equipment: "GYM",
      }}
    />
  );
}
