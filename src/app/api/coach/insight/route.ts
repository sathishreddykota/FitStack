import { z } from "zod";
import { ok, parseQuery, route } from "@/server/http";
import { assertPro, requireApiUser, timezoneOf, todayOf } from "@/server/auth";
import { consumeAIQuota } from "@/server/ai";
import { getDailyInsight } from "@/server/coach/service";

export const maxDuration = 60;

// GET /api/coach/insight[?refresh=1] — one insight per day, cached server-side (PRO)
export const GET = route("GET /api/coach/insight", async (req) => {
  const user = await requireApiUser();
  assertPro(user);
  const { refresh } = parseQuery(req, z.object({ refresh: z.enum(["0", "1"]).optional() }));
  if (refresh === "1") await consumeAIQuota(user.id, "insight", timezoneOf(user));
  const insight = await getDailyInsight(user, todayOf(user).str, { refresh: refresh === "1" });
  if (!insight.cached && refresh !== "1") await consumeAIQuota(user.id, "insight", timezoneOf(user));
  return ok(insight);
});
