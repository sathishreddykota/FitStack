import { HttpError, ok, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { hasDevices, pushConfigured, sendToUser } from "@/server/notifications/push";

// POST /api/push/test — "Send me a test notification" (settings screen).
export const POST = route("POST /api/push/test", async () => {
  const user = await requireApiUser();
  if (!pushConfigured()) throw new HttpError(503, "Notifications aren't set up on the server yet.", "INTERNAL");
  if (!(await hasDevices(user.id))) throw new HttpError(409, "Open the FitStack app on your phone and allow notifications first.", "CONFLICT");
  const sent = await sendToUser(user.id, [
    { kind: "goals_left", title: "FitStack notifications are on ✅", body: "This is how your reminders and achievements will look.", url: "/dashboard" },
  ]);
  return ok({ sent });
});
