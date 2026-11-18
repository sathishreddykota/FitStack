import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { prefsFor } from "@/server/notifications/service";
import { prefsPatchSchema, updatePrefs } from "@/server/notifications/prefs";
import { pushConfigured } from "@/server/notifications/push";

// GET /api/notifications/prefs — switches, times and whether a phone is registered
export const GET = route("GET /api/notifications/prefs", async () => {
  const user = await requireApiUser();
  const [prefs, phones] = await Promise.all([prefsFor(user.id), prisma.pushDevice.count({ where: { userId: user.id } })]);
  return ok({ prefs, phones, serverReady: pushConfigured() });
});

// PATCH /api/notifications/prefs — change any subset
export const PATCH = route("PATCH /api/notifications/prefs", async (req) => {
  const user = await requireApiUser();
  const patch = await parseBody(req, prefsPatchSchema);
  return ok({ prefs: await updatePrefs(user.id, patch) });
});
