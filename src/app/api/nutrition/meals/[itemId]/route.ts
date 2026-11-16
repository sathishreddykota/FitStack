import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { deleteMealItem, updateMealItem } from "@/server/nutrition/service";
import { updateMealItemSchema } from "@/server/schemas";

type Ctx = { params: Promise<{ itemId: string }> };

export const PATCH = route<Ctx>("PATCH /api/nutrition/meals/:itemId", async (req, { params }) => {
  const user = await requireApiUser();
  const { itemId } = await params;
  const body = await parseBody(req, updateMealItemSchema);
  return ok(await updateMealItem(user.id, itemId, body));
});

export const DELETE = route<Ctx>("DELETE /api/nutrition/meals/:itemId", async (_req, { params }) => {
  const user = await requireApiUser();
  const { itemId } = await params;
  await deleteMealItem(user.id, itemId);
  return ok({ deleted: true });
});
