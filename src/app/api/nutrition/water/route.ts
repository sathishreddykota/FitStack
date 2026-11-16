import { z } from "zod";
import { ok, parseBody, parseQuery, route } from "@/server/http";
import { requireApiUser, todayOf } from "@/server/auth";
import { dateStringSchema } from "@/server/dates";
import { logWater, waterForDay } from "@/server/tracking";
import { waterLogSchema } from "@/server/schemas";

// GET /api/nutrition/water?date=YYYY-MM-DD
export const GET = route("GET /api/nutrition/water", async (req) => {
  const user = await requireApiUser();
  const { date } = parseQuery(req, z.object({ date: dateStringSchema.optional() }));
  return ok(await waterForDay(user.id, date ?? todayOf(user).str));
});

// POST /api/nutrition/water { amountMl, date? }
export const POST = route("POST /api/nutrition/water", async (req) => {
  const user = await requireApiUser();
  const { amountMl, date } = await parseBody(req, waterLogSchema);
  return ok(await logWater(user.id, date ?? todayOf(user).str, amountMl), { status: 201 });
});
