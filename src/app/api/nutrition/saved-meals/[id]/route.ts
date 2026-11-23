import { ok, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { deleteSavedMeal } from "@/server/nutrition/service";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>("DELETE /api/nutrition/saved-meals/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  await deleteSavedMeal(user.id, id);
  return ok({ deleted: true });
});
