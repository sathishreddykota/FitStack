import { z } from "zod";
import { ok, parseBody, route } from "@/server/http";

// POST /api/native-auth/log — the sign-in browser tab reports where it got stuck,
// so a failure on a phone shows up in the server log (no session needed; nothing stored).
export const POST = route("POST /api/native-auth/log", async (req) => {
  const { stage, detail } = await parseBody(req, z.object({ stage: z.string().max(40), detail: z.string().max(300) }));
  console.warn(`[native-auth] ${stage}: ${detail}`);
  return ok({ logged: true });
});
