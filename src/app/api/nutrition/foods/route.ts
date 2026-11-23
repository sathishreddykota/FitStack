import { z } from "zod";
import { ok, parseQuery, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { searchFoods } from "@/server/nutrition/service";

const query = z.object({ q: z.string().max(80).default(""), limit: z.coerce.number().int().min(1).max(50).default(25) });

// GET /api/nutrition/foods?q=dosa&limit=25
export const GET = route("GET /api/nutrition/foods", async (req) => {
  const user = await requireApiUser();
  const { q, limit } = parseQuery(req, query);
  return ok(await searchFoods(user.id, q, limit));
});
