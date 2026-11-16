import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { quickAdd } from "@/server/nutrition/service";
import { quickAddSchema } from "@/server/schemas";

// POST /api/nutrition/meals/quick-add — log raw macros
export const POST = route("POST /api/nutrition/meals/quick-add", async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, quickAddSchema);
  return ok(await quickAdd(user.id, body), { status: 201 });
});
