import { ok, parseBody, route } from "@/server/http";
import { assertPro, requireApiUser, todayOf } from "@/server/auth";
import { logSleep } from "@/server/tracking";
import { sleepLogSchema } from "@/server/schemas";

// POST /api/recovery/sleep (PRO)
export const POST = route("POST /api/recovery/sleep", async (req) => {
  const user = await requireApiUser();
  assertPro(user);
  const body = await parseBody(req, sleepLogSchema);
  return ok(await logSleep(user.id, { ...body, date: body.date ?? todayOf(user).str }));
});
