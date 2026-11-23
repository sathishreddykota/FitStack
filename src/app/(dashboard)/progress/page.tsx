import type { Metadata } from "next";
import { requireOnboardedUser, todayOf } from "@/server/auth";
import {
  getNutritionAnalytics,
  getRecentPRs,
  getStrengthProgression,
  getWeightAnalytics,
  getWorkoutAnalytics,
  trainedExercises,
  type DateRange,
} from "@/server/progress";
import { PremiumGate } from "@/components/shared/premium-gate";
import { ProgressClient } from "./progress-client";

export const metadata: Metadata = {
  title: "Progress & Analytics",
  description: "Track your fitness journey",
};

interface ProgressPageProps {
  searchParams: Promise<{ range?: string; exerciseId?: string }>;
}

function parseRange(v: string | undefined): DateRange {
  if (v === "all") return "all";
  const n = Number(v);
  return n === 7 || n === 90 ? n : 30;
}

// Data loads only inside the gate, so nothing premium is fetched for free users.
async function ProgressData({ range, exerciseId }: { range: DateRange; exerciseId?: string }) {
  const user = await requireOnboardedUser();
  const today = todayOf(user).str;
  const availableExercises = await trainedExercises(user.id);
  const selectedExerciseId =
    exerciseId && availableExercises.some((e) => e.id === exerciseId) ? exerciseId : (availableExercises[0]?.id ?? "");

  const [weightData, nutritionData, workoutData, strengthData, recentPRs] = await Promise.all([
    getWeightAnalytics(user.id, range, today),
    getNutritionAnalytics(user.id, range, today),
    getWorkoutAnalytics(user.id, range, today),
    selectedExerciseId
      ? getStrengthProgression(user.id, selectedExerciseId)
      : Promise.resolve({ chartData: [], allTimeMax1RM: 0, allTimeMaxWeight: 0 }),
    getRecentPRs(user.id),
  ]);

  return (
    <ProgressClient
      range={range}
      today={today}
      weightData={weightData}
      nutritionData={nutritionData}
      workoutData={workoutData}
      strengthData={strengthData}
      recentPRs={recentPRs}
      availableExercises={availableExercises}
      selectedExerciseId={selectedExerciseId}
    />
  );
}

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
  const params = await searchParams;
  return (
    <PremiumGate
      title="Unlock Progress Analytics"
      description="See your weight trend, nutrition consistency, training volume, strength curves and PRs."
    >
      <ProgressData range={parseRange(params.range)} exerciseId={params.exerciseId} />
    </PremiumGate>
  );
}
