import { ok, parseBody, route } from "@/server/http";
import { requireApiUser, todayOf } from "@/server/auth";
import { logWeight } from "@/server/tracking";
import { weightLogSchema } from "@/server/schemas";

// POST /api/progress/weight { weightKg, date?, bodyFatPercent?, notes? }
export const POST = route("POST /api/progress/weight", async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, weightLogSchema);
  return ok(await logWeight(user.id, { ...body, date: body.date ?? todayOf(user).str }), { status: 201 });
});
