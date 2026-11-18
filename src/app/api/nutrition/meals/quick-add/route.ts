import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { quickAdd } from "@/server/nutrition/service";
import { quickAddSchema } from "@/server/schemas";
import { achievementsAfterResponse } from "@/server/notifications/notify";

// POST /api/nutrition/meals/quick-add — log raw macros
export const POST = route("POST /api/nutrition/meals/quick-add", async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, quickAddSchema);
  const item = await quickAdd(user.id, body);
  achievementsAfterResponse(user.id);
  return ok(item, { status: 201 });
});
