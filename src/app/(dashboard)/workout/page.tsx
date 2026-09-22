import { getRequiredUser } from "@/lib/auth";
import type { Metadata } from "next";
import { WorkoutHubClient } from "./workout-hub-client";
import { getCalendarSessions } from "@/lib/services/workout-service";
import { startOfWeek, endOfWeek } from "date-fns";
import { PremiumGate } from "@/components/shared/premium-gate";

export const metadata: Metadata = { title: "Workout" };

export default async function WorkoutPage() {
  const user = await getRequiredUser();
  
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

  const sessions = await getCalendarSessions(user.id, weekStart, weekEnd);

  return (
    <PremiumGate title="Unlock Workout Tracking" description="Upgrade to PRO to build custom training plans and log your heavy lifts.">
      <WorkoutHubClient 
        initialSessions={sessions} 
        userId={user.id}
      />
    </PremiumGate>
  );
}
