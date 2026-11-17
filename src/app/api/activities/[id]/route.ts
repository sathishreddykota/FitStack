import { ok, parseBody, route } from "@/server/http";
import { assertPro, requireApiUser } from "@/server/auth";
import { deleteActivity, getActivity, updateActivity } from "@/server/activity/service";
import { updateActivitySchema } from "@/server/activity/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>("GET /api/activities/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  assertPro(user);
  return ok(await getActivity(user.id, (await params).id));
});

// PATCH { title?, notes?, feel?, isPrivate? }
export const PATCH = route<Ctx>("PATCH /api/activities/:id", async (req, { params }) => {
  const user = await requireApiUser();
  assertPro(user);
  return ok(await updateActivity(user.id, (await params).id, await parseBody(req, updateActivitySchema)));
});

// Deleting is always allowed, even after PRO ends — it's the user's data.
export const DELETE = route<Ctx>("DELETE /api/activities/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  await deleteActivity(user.id, (await params).id);
  return ok({ deleted: true });
});
