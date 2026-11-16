import { z } from "zod";
import { badRequest, ok, parseQuery, route } from "@/server/http";
import { requireApiUser, todayOf } from "@/server/auth";
import { dateStringSchema, diffDays, endOfMonth, startOfMonth } from "@/server/dates";
import { CALENDAR_WEEKS, scheduleWeeks, sessionsInRange } from "@/server/workout/service";
import { prisma } from "@/lib/prisma";

const query = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

// GET /api/workout/calendar?month=2026-11  or  ?from=…&to=…  (defaults to the current month)
export const GET = route("GET /api/workout/calendar", async (req) => {
  const user = await requireApiUser();
  const today = todayOf(user).str;
  const q = parseQuery(req, query);
  const anchor = q.month ? `${q.month}-01` : today;
  const from = q.from ?? startOfMonth(anchor);
  const to = q.to ?? endOfMonth(anchor);
  if (to < from || diffDays(from, to) > 92) throw badRequest("Range must be 1–92 days.");

  // Keep the active plan scheduled ahead (rolling window).
  const plan = await prisma.trainingPlan.findFirst({ where: { userId: user.id, isActive: true }, select: { id: true } });
  if (plan) await scheduleWeeks(user.id, plan.id, today, CALENDAR_WEEKS);

  return ok({ from, to, today, sessions: await sessionsInRange(user.id, from, to, today) });
});
