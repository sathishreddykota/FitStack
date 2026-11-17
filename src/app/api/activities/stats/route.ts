import { ok, route } from "@/server/http";
import { assertPro, requireApiUser, todayOf } from "@/server/auth";
import { activityStats } from "@/server/activity/service";

// GET /api/activities/stats — this week, last 12 weeks, personal bests, longest run (PRO)
export const GET = route("GET /api/activities/stats", async () => {
  const user = await requireApiUser();
  assertPro(user);
  return ok(await activityStats(user.id, todayOf(user).str));
});
