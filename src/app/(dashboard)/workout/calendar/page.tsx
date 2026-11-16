import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser, todayOf } from "@/server/auth";
import { endOfMonth, startOfMonth } from "@/server/dates";
import { CALENDAR_WEEKS, scheduleWeeks, sessionsInRange } from "@/server/workout/service";
import { CalendarClient, type CalendarSession } from "./calendar-client";

export const metadata: Metadata = { title: "Training Calendar" };

export default async function CalendarPage() {
  const user = await requireOnboardedUser();
  const today = todayOf(user).str;
  const plan = await prisma.trainingPlan.findFirst({ where: { userId: user.id, isActive: true }, select: { id: true } });
  if (plan) await scheduleWeeks(user.id, plan.id, today, CALENDAR_WEEKS);

  const sessions = await sessionsInRange(user.id, startOfMonth(today), endOfMonth(today), today);
  const initial: CalendarSession[] = sessions.map((s) => ({ id: s.id, name: s.name, day: s.day, status: s.status }));
  return <CalendarClient today={today} initialSessions={initial} />;
}
