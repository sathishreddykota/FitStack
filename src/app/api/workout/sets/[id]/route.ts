import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { deleteSet, updateSet } from "@/server/workout/service";
import { setPatchSchema } from "@/server/workout/schemas";

type Ctx = { params: Promise<{ id: string }> };

// PATCH { weightKg?, reps?, rpe?, setType?, completed? } — returns the set incl. isPersonalRecord
export const PATCH = route<Ctx>("PATCH /api/workout/sets/:id", async (req, { params }) => {
  const user = await requireApiUser();
  return ok(await updateSet(user.id, (await params).id, await parseBody(req, setPatchSchema)));
});

export const DELETE = route<Ctx>("DELETE /api/workout/sets/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  await deleteSet(user.id, (await params).id);
  return ok({ deleted: true });
});
