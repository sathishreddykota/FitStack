import { ok, parseBody, parseQuery, route } from "@/server/http";
import { assertPro, requireApiUser } from "@/server/auth";
import { listActivities, saveActivity } from "@/server/activity/service";
import { listActivitiesQuery, saveActivitySchema } from "@/server/activity/schemas";

// GET /api/activities?type=RUN&cursor=…&limit=20 — newest first (PRO)
export const GET = route("GET /api/activities", async (req) => {
  const user = await requireApiUser();
  assertPro(user);
  return ok(await listActivities(user.id, parseQuery(req, listActivitiesQuery)));
});

// POST /api/activities — save a GPS recording or a manual entry (PRO).
// Re-sending the same clientId returns the existing activity (safe to retry offline uploads).
export const POST = route("POST /api/activities", async (req) => {
  const user = await requireApiUser();
  assertPro(user);
  const body = await parseBody(req, saveActivitySchema);
  const result = await saveActivity(user, body);
  return ok(result, { status: result.duplicate ? 200 : 201 });
});
