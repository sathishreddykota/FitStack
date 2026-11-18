import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest } from "@/server/http";
import { inQuietHours, isValidTime, toMinutes, type Prefs } from "./rules";
import { prefsFor } from "./service";

const time = z.string().refine(isValidTime, { message: "Use a time like 07:30" });

/** PATCH body: any subset of the preferences. */
export const prefsPatchSchema = z
  .object({
    enabled: z.boolean(),
    mealReminders: z.boolean(),
    goalReminders: z.boolean(),
    achievements: z.boolean(),
    morningRecap: z.boolean(),
    breakfastAt: time,
    lunchAt: time,
    dinnerAt: time,
    summaryAt: time,
    recapAt: time,
    quietStart: time,
    quietEnd: time,
  })
  .partial()
  .strict();

const LABEL: Partial<Record<keyof Prefs, string>> = {
  breakfastAt: "Breakfast reminder",
  lunchAt: "Lunch reminder",
  dinnerAt: "Dinner reminder",
  summaryAt: "Evening summary",
  recapAt: "Morning recap",
};

/** Problems with a full set of preferences, as user-facing sentences (empty = fine). */
export function prefsProblems(p: Prefs): string[] {
  const out: string[] = [];
  // A reminder set inside quiet hours would silently never arrive.
  for (const key of ["breakfastAt", "lunchAt", "dinnerAt", "summaryAt", "recapAt"] as const) {
    if (inQuietHours(toMinutes(p[key]), p)) out.push(`${LABEL[key]} (${p[key]}) is inside quiet hours (${p.quietStart}–${p.quietEnd}).`);
  }
  const meals = [toMinutes(p.breakfastAt), toMinutes(p.lunchAt), toMinutes(p.dinnerAt)];
  if (!(meals[0] < meals[1] && meals[1] < meals[2])) out.push("Meal reminders should go breakfast → lunch → dinner.");
  if (toMinutes(p.summaryAt) <= toMinutes(p.dinnerAt)) out.push("The evening summary should come after the dinner reminder.");
  return out;
}

export async function updatePrefs(userId: string, patch: z.infer<typeof prefsPatchSchema>): Promise<Prefs> {
  const next: Prefs = { ...(await prefsFor(userId)), ...patch };
  const problems = prefsProblems(next);
  if (problems.length) throw badRequest(problems[0], { problems });
  await prisma.notificationPrefs.upsert({ where: { userId }, create: { userId, ...next }, update: next });
  return next;
}

