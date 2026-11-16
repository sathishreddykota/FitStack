import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { previewPlan } from "@/server/workout/service";
import { planInputSchema } from "@/server/workout/schemas";

// POST /api/workout/plan/preview — see a plan before saving it (free; saving is PRO)
export const POST = route("POST /api/workout/plan/preview", async (req) => {
  await requireApiUser();
  return ok(await previewPlan(await parseBody(req, planInputSchema)));
});
