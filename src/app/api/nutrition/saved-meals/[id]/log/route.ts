import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { logSavedMeal } from "@/server/nutrition/service";
import { logSavedMealSchema } from "@/server/schemas";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/nutrition/saved-meals/:id/log — add all of a saved meal's foods to a day
export const POST = route<Ctx>("POST /api/nutrition/saved-meals/:id/log", async (req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  const body = await parseBody(req, logSavedMealSchema);
  return ok(await logSavedMeal(user.id, id, body), { status: 201 });
});
