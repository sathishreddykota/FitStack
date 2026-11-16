import { ok, parseBody, route } from "@/server/http";
import { assertPro, requireApiUser, timezoneOf } from "@/server/auth";
import { consumeAIQuota } from "@/server/ai";
import { logWorkoutFromText } from "@/server/workout/ai-log";
import { magicLogSchema } from "@/server/workout/schemas";

type Ctx = { params: Promise<{ id: string }> };
export const maxDuration = 60;

// POST /api/workout/session/:id/magic { text } — AI workout logging (PRO)
export const POST = route<Ctx>("POST /api/workout/session/:id/magic", async (req, { params }) => {
  const user = await requireApiUser();
  assertPro(user);
  const { text } = await parseBody(req, magicLogSchema);
  await consumeAIQuota(user.id, "workoutParse", timezoneOf(user));
  return ok(await logWorkoutFromText(user.id, (await params).id, text), { status: 201 });
});
