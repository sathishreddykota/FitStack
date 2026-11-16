import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { createSavedMeal, listSavedMeals, saveMealFromLog } from "@/server/nutrition/service";
import { savedMealSchema } from "@/server/schemas";

export const GET = route("GET /api/nutrition/saved-meals", async () => {
  const user = await requireApiUser();
  return ok(await listSavedMeals(user.id));
});

export const POST = route("POST /api/nutrition/saved-meals", async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, savedMealSchema);
  const saved =
    "fromLog" in body
      ? await saveMealFromLog(user.id, { name: body.name, ...body.fromLog })
      : await createSavedMeal(user.id, body);
  return ok(saved, { status: 201 });
});
