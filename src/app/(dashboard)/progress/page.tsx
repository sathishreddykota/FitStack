import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { ProgressClient } from "./progress-client";
import {
  getWeightAnalytics,
  getNutritionAnalytics,
  getWorkoutAnalytics,
  getStrengthProgression,
  getRecentPRs,
  type DateRange,
} from "@/lib/services/progress-service";
import { PremiumGate } from "@/components/shared/premium-gate";

export const metadata: Metadata = {
  title: "Progress & Analytics",
  description: "Track your fitness journey",
};

interface ProgressPageProps {
  searchParams: Promise<{ range?: string; exerciseId?: string }>;
}

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
  const user = await getRequiredUser();
  const params = await searchParams;

  const rangeValue = params.range === "all" ? "all" : Number(params.range || 30);
  const range = (["all", 7, 30, 90].includes(rangeValue as any) ? rangeValue : 30) as DateRange;

  // Find user's key lifts for the dropdown
  const userExercises = await prisma.exercise.findMany({
    where: {
      sessionExercises: {
        some: { session: { userId: user.id } }
      },
      isKeyLift: true
    },
    select: { id: true, name: true }
  });

  // If no key lifts, fallback to any exercises they've done
  const availableExercises = userExercises.length > 0 
    ? userExercises 
    : await prisma.exercise.findMany({
        where: { sessionExercises: { some: { session: { userId: user.id } } } },
        select: { id: true, name: true },
        take: 10
      });

  const selectedExerciseId = params.exerciseId || availableExercises[0]?.id || "";

  // Fetch all analytics data in parallel
  const [
    weightData,
    nutritionData,
    workoutData,
    strengthData,
    recentPRs,
  ] = await Promise.all([
    getWeightAnalytics(user.id, range),
    getNutritionAnalytics(user.id, range),
    getWorkoutAnalytics(user.id, range),
    selectedExerciseId ? getStrengthProgression(user.id, selectedExerciseId) : Promise.resolve({ chartData: [], allTimeMax1RM: 0, allTimeMaxWeight: 0 }),
    getRecentPRs(user.id),
  ]);

  return (
    <PremiumGate title="Unlock Progress Analytics" description="Upgrade to PRO to view deep analytics, strength trends, and macro distribution charts.">
      <ProgressClient 
        range={range}
        weightData={weightData}
        nutritionData={nutritionData}
        workoutData={workoutData}
        strengthData={strengthData}
        recentPRs={recentPRs}
        availableExercises={availableExercises}
        selectedExerciseId={selectedExerciseId}
      />
    </PremiumGate>
  );
}
