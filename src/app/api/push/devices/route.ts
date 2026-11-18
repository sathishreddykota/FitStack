import { z } from "zod";
import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";

const deviceSchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["android", "ios", "web"]).default("android"),
});

// POST /api/push/devices — the app registers its notification token (on every launch).
export const POST = route("POST /api/push/devices", async (req) => {
  const user = await requireApiUser();
  const { token, platform } = await parseBody(req, deviceSchema);
  // A token belongs to one install; if someone else signs in on that phone, it moves to them.
  await prisma.pushDevice.upsert({
    where: { token },
    create: { token, platform, userId: user.id },
    update: { userId: user.id, platform, lastSeenAt: new Date() },
  });
  return ok({ registered: true });
});

// DELETE /api/push/devices — sign-out on this phone: stop sending to it.
export const DELETE = route("DELETE /api/push/devices", async (req) => {
  const user = await requireApiUser();
  const { token } = await parseBody(req, deviceSchema.pick({ token: true }));
  const { count } = await prisma.pushDevice.deleteMany({ where: { token, userId: user.id } });
  return ok({ removed: count });
});
