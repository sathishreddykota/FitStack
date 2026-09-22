import { getRequiredUser } from "@/lib/auth";
import type { Metadata } from "next";
import { CalendarClient } from "./calendar-client";
import { getCalendarSessions } from "@/lib/services/workout-service";
import { startOfMonth, endOfMonth } from "date-fns";

export const metadata: Metadata = { title: "Training Calendar" };

export default async function CalendarPage() {
  const user = await getRequiredUser();
  const today = new Date();
  
  // Fetch current month's sessions to start
  const sessions = await getCalendarSessions(user.id, startOfMonth(today), endOfMonth(today));

  return <CalendarClient initialSessions={sessions} userId={user.id} />;
}
