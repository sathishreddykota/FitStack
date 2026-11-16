import { z } from "zod";
import { ok, parseBody, parseQuery, route } from "@/server/http";
import { requireApiUser, todayOf } from "@/server/auth";
import { dateStringSchema } from "@/server/dates";
import { dailyTotals, getDayMeals, logFood } from "@/server/nutrition/service";
import { logFoodSchema } from "@/server/schemas";

// GET /api/nutrition/meals?date=YYYY-MM-DD  (defaults to the user's today)
export const GET = route("GET /api/nutrition/meals", async (req) => {
  const user = await requireApiUser();
  const { date } = parseQuery(req, z.object({ date: dateStringSchema.optional() }));
  const day = date ?? todayOf(user).str;
  const meals = await getDayMeals(user.id, day);
  return ok({ date: day, meals, totals: dailyTotals(meals) });
});

// POST /api/nutrition/meals — log a food
export const POST = route("POST /api/nutrition/meals", async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, logFoodSchema);
  return ok(await logFood(user.id, body), { status: 201 });
});
