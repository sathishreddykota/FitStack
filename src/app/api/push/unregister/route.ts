import { z } from "zod";
import { ok, parseBody, route } from "@/server/http";
import { prisma } from "@/lib/prisma";

// POST /api/push/unregister — called right after sign-out on a phone, so there's no session.
// The token itself proves it's this device (only the phone and our server know it), and
// the only thing it can do is stop notifications to that one phone.
export const POST = route("POST /api/push/unregister", async (req) => {
  const { token } = await parseBody(req, z.object({ token: z.string().min(20).max(4096) }));
  const { count } = await prisma.pushDevice.deleteMany({ where: { token } });
  return ok({ removed: count });
});
