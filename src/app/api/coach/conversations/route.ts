import { ok, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { listConversations } from "@/server/coach/service";

// GET /api/coach/conversations — newest first
export const GET = route("GET /api/coach/conversations", async () => {
  const user = await requireApiUser();
  return ok(await listConversations(user.id));
});
