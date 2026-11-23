import { ok, parseBody, route } from "@/server/http";
import { assertPro, requireApiUser, todayOf } from "@/server/auth";
import { generatePlan, getActivePlan } from "@/server/workout/service";
import { planInputSchema } from "@/server/workout/schemas";

// GET /api/workout/plan — the active plan (or null)
export const GET = route("GET /api/workout/plan", async () => {
  const user = await requireApiUser();
  return ok(await getActivePlan(user.id));
});

// POST /api/workout/plan — generate, activate and schedule a plan (PRO)
export const POST = route("POST /api/workout/plan", async (req) => {
  const user = await requireApiUser();
  assertPro(user);
  const input = await parseBody(req, planInputSchema);
  return ok(await generatePlan(user.id, input, todayOf(user).str), { status: 201 });
});
