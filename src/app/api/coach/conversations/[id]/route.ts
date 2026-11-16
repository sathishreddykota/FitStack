import { ok, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { deleteConversation, getConversationMessages } from "@/server/coach/service";

type Ctx = { params: Promise<{ id: string }> };

// GET — messages in useChat (UIMessage) format
export const GET = route<Ctx>("GET /api/coach/conversations/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  return ok(await getConversationMessages(user.id, (await params).id));
});

export const DELETE = route<Ctx>("DELETE /api/coach/conversations/:id", async (_req, { params }) => {
  const user = await requireApiUser();
  await deleteConversation(user.id, (await params).id);
  return ok({ deleted: true });
});
