import { ok, parseBody, route } from "@/server/http";
import { assertPro, requireApiUser, timezoneOf } from "@/server/auth";
import { consumeAIQuota } from "@/server/ai";
import { logFoodFromText } from "@/server/nutrition/ai-log";
import { aiFoodLogSchema } from "@/server/schemas";

export const maxDuration = 60;

// POST /api/nutrition/meals/ai — "2 chapati and dal" → logged items (PRO)
export const POST = route("POST /api/nutrition/meals/ai", async (req) => {
  const user = await requireApiUser();
  assertPro(user);
  const body = await parseBody(req, aiFoodLogSchema);
  await consumeAIQuota(user.id, "foodParse", timezoneOf(user));
  return ok({ items: await logFoodFromText(user.id, body) }, { status: 201 });
});
