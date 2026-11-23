import { ok, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { addSet } from "@/server/workout/service";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/workout/session-exercises/:id/sets — add a set (copies the previous one)
export const POST = route<Ctx>("POST /api/workout/session-exercises/:id/sets", async (_req, { params }) => {
  const user = await requireApiUser();
  return ok(await addSet(user.id, (await params).id), { status: 201 });
});
