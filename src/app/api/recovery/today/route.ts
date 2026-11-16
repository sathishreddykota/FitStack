import { ok, route } from "@/server/http";
import { assertPro, requireApiUser, todayOf } from "@/server/auth";
import { recoveryForDay, recoveryTrend } from "@/server/tracking";

// GET /api/recovery/today — today's logs + 30-day trend (PRO)
export const GET = route("GET /api/recovery/today", async () => {
  const user = await requireApiUser();
  assertPro(user);
  const today = todayOf(user).str;
  const [day, trend] = await Promise.all([recoveryForDay(user.id, today), recoveryTrend(user.id, today)]);
  return ok({ date: today, ...day, trend });
});
