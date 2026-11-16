import { ok, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { deleteWater } from "@/server/tracking";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>("DELETE /api/nutrition/water/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  await deleteWater(user.id, id);
  return ok({ deleted: true });
});
