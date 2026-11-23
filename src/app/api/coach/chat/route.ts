import { z } from "zod";
import type { UIMessage } from "ai";
import { parseBody, route } from "@/server/http";
import { assertPro, requireApiUser, timezoneOf, todayOf } from "@/server/auth";
import { consumeAIQuota } from "@/server/ai";
import { streamCoachReply } from "@/server/coach/service";

export const maxDuration = 60;

const body = z.object({
  id: z.string().min(8).max(64), // conversation id (the useChat id)
  message: z.object({
    id: z.string().max(64),
    role: z.literal("user"),
    parts: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).min(1).max(10),
  }),
});

// POST /api/coach/chat — streams a UI-message response (AI SDK useChat protocol). PRO.
export const POST = route("POST /api/coach/chat", async (req) => {
  const user = await requireApiUser();
  assertPro(user);
  const { id, message } = await parseBody(req, body);
  await consumeAIQuota(user.id, "coach", timezoneOf(user));
  return streamCoachReply(user, todayOf(user).str, id, message as UIMessage);
});
