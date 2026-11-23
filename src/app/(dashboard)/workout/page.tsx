import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { entitlementOf, requireOnboardedUser, todayOf } from "@/server/auth";
import { addDays, startOfWeek } from "@/server/dates";
import { CALENDAR_WEEKS, scheduleWeeks, sessionsInRange } from "@/server/workout/service";
import { WorkoutHubClient } from "./workout-hub-client";

export const metadata: Metadata = { title: "Workout" };

// Workout hub. Manual logging is free; plans are PRO.
export default async function WorkoutPage() {
  const user = await requireOnboardedUser();
  const today = todayOf(user).str;
  const weekStart = startOfWeek(today);

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: user.id, isActive: true },
    select: { id: true, name: true },
  });
  if (plan) await scheduleWeeks(user.id, plan.id, today, CALENDAR_WEEKS);
  const sessions = await sessionsInRange(user.id, weekStart, addDays(weekStart, 6), today);

  return (
    <WorkoutHubClient
      today={today}
      weekStart={weekStart}
      initialSessions={sessions.map((s) => ({
        id: s.id,
        name: s.name,
        day: s.day,
        status: s.status,
        durationMinutes: s.durationMinutes,
        exercises: s.exercises.map((e) => ({
          id: e.id,
          name: e.exercise.name,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          targetWeightKg: e.targetWeightKg,
        })),
      }))}
      planName={plan?.name ?? null}
      isPro={entitlementOf(user).isPro}
    />
  );
}
