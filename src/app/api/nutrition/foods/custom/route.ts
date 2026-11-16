import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { createCustomFood } from "@/server/nutrition/service";
import { customFoodSchema } from "@/server/schemas";

// POST /api/nutrition/foods/custom — create a private food
export const POST = route("POST /api/nutrition/foods/custom", async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, customFoodSchema);
  return ok(await createCustomFood(user.id, body), { status: 201 });
});
