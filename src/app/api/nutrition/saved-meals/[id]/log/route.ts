import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { logSavedMeal } from "@/server/nutrition/service";
import { logSavedMealSchema } from "@/server/schemas";
import { achievementsAfterResponse } from "@/server/notifications/notify";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/nutrition/saved-meals/:id/log — add all of a saved meal's foods to a day
export const POST = route<Ctx>("POST /api/nutrition/saved-meals/:id/log", async (req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  const body = await parseBody(req, logSavedMealSchema);
  const result = await logSavedMeal(user.id, id, body);
  achievementsAfterResponse(user.id);
  return ok(result, { status: 201 });
});
