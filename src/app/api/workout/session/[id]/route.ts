import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { applySessionAction, deleteSession, getSession } from "@/server/workout/service";
import { sessionActionSchema } from "@/server/workout/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>("GET /api/workout/session/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  return ok(await getSession(user.id, (await params).id));
});

// PATCH { action: START | COMPLETE | SKIP | UNSKIP | RESCHEDULE | RENAME }
export const PATCH = route<Ctx>("PATCH /api/workout/session/:id", async (req, { params }) => {
  const user = await requireApiUser();
  const input = await parseBody(req, sessionActionSchema);
  return ok(await applySessionAction(user.id, (await params).id, input));
});

export const DELETE = route<Ctx>("DELETE /api/workout/session/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  await deleteSession(user.id, (await params).id);
  return ok({ deleted: true });
});
