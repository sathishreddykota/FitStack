import { ok, parseBody, route } from "@/server/http";
import { assertPro, requireApiUser, todayOf } from "@/server/auth";
import { logHabits } from "@/server/tracking";
import { habitLogSchema } from "@/server/schemas";

// POST /api/recovery/habits (PRO)
export const POST = route("POST /api/recovery/habits", async (req) => {
  const user = await requireApiUser();
  assertPro(user);
  const body = await parseBody(req, habitLogSchema);
  return ok(await logHabits(user.id, { ...body, date: body.date ?? todayOf(user).str }));
});
