import { ok, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { removeExercise } from "@/server/workout/service";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>("DELETE /api/workout/session-exercises/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  await removeExercise(user.id, (await params).id);
  return ok({ deleted: true });
});
