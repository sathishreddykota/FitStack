import { ok, parseBody, route } from "@/server/http";
import { requireApiUser, todayOf } from "@/server/auth";
import { createSession } from "@/server/workout/service";
import { createSessionSchema } from "@/server/workout/schemas";

// POST /api/workout/session — start a custom (unplanned) workout. Free.
export const POST = route("POST /api/workout/session", async (req) => {
  const user = await requireApiUser();
  const input = await parseBody(req, createSessionSchema);
  return ok(await createSession(user.id, { ...input, date: input.date ?? todayOf(user).str }), { status: 201 });
});
