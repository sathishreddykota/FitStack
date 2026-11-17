import "server-only";
import { tool } from "ai";
import { z } from "zod";
import type { AppUser } from "../auth";
import { HttpError } from "../http";
import { logFoodFromText } from "../nutrition/ai-log";
import { searchFoods } from "../nutrition/service";
import { logWater, logWeight } from "../tracking";
import { recentHistory, todaySummary, upcomingWorkouts } from "./context";

// ─────────────────────────────────────────────
// Tools the AI coach can call. Every tool is bound to the signed-in user —
// the model never supplies a user id.
// ─────────────────────────────────────────────

const mealType = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "PRE_WORKOUT", "POST_WORKOUT"]);

/** Turn our errors into something the model can relay instead of crashing the stream. */
async function safe<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return { error: err.message };
    console.error("[coach tool]", err);
    return { error: "That didn't work, please try again." };
  }
}

export function coachTools(user: AppUser, today: string) {
  return {
    getToday: tool({
      description: "Today's food (totals and meals), water, workouts, sleep and latest weight versus the user's targets.",
      inputSchema: z.object({}),
      execute: () => safe(() => todaySummary(user, today)),
    }),
    getHistory: tool({
      description:
        "Daily nutrition, water, completed workouts with sets, weight trend and recovery for the last N days. Use before giving advice about progress.",
      inputSchema: z.object({ days: z.number().optional().describe("1 to 60, default 14") }),
      execute: ({ days }) => safe(() => recentHistory(user, today, Math.round(days ?? 14))),
    }),
    getUpcomingWorkouts: tool({
      description: "Scheduled workouts for the next 7 days with exercises and targets.",
      inputSchema: z.object({}),
      execute: () => safe(() => upcomingWorkouts(user.id, today)),
    }),
    searchFoods: tool({
      description: "Look up foods in the database (nutrition per 100 g).",
      inputSchema: z.object({ query: z.string() }),
      execute: ({ query }) =>
        safe(async () =>
          (await searchFoods(user.id, query.slice(0, 60), 8)).map((f) => ({
            name: f.name,
            per100g: { kcal: f.caloriesPer100g, protein: f.proteinPer100g, carbs: f.carbsPer100g, fat: f.fatPer100g },
          })),
        ),
    }),
    logFood: tool({
      description:
        "Log food the user says they ate TODAY. Only call when the user clearly asks you to log it. Describe quantities in plain words, e.g. '2 chapati and 1 bowl dal'.",
      inputSchema: z.object({ description: z.string(), mealType }),
      execute: ({ description, mealType }) =>
        safe(async () => {
          if (description.trim().length < 2) return { error: "Describe what was eaten." };
          return { logged: await logFoodFromText(user.id, { text: description.slice(0, 300), mealType, date: today }) };
        }),
    }),
    logWater: tool({
      description: "Log water the user drank today, in millilitres. Only when asked.",
      inputSchema: z.object({ amountMl: z.number().describe("50 to 3000") }),
      execute: ({ amountMl }) =>
        safe(async () => {
          const ml = Math.round(amountMl);
          if (!(ml >= 50 && ml <= 3000)) return { error: "Water must be between 50 and 3000 ml." };
          await logWater(user.id, today, ml);
          return { loggedMl: ml };
        }),
    }),
    logWeight: tool({
      description: "Log today's body weight in kg. Only when the user gives a number and asks to log it.",
      inputSchema: z.object({ weightKg: z.number() }),
      execute: ({ weightKg }) =>
        safe(async () => {
          if (!(weightKg >= 25 && weightKg <= 350)) return { error: "That weight looks wrong (25–350 kg)." };
          await logWeight(user.id, { date: today, weightKg });
          return { loggedKg: weightKg };
        }),
    }),
  };
}
