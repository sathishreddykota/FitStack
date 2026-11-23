import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { HttpError, ok, parseBody, route } from "@/server/http";
import { completeHandoff } from "@/server/native-auth";

// POST /api/native-auth/complete — called by the browser tab once Google sign-in is done
// (the tab is signed in now). Marks the app's hand-off with this user.
export const POST = route("POST /api/native-auth/complete", async (req) => {
  const { userId } = await auth();
  if (!userId) throw new HttpError(401, "Please sign in.", "UNAUTHENTICATED");
  const { id } = await parseBody(req, z.object({ id: z.string().regex(/^[a-z0-9]{10,64}$/) }));
  // false = already completed (page reloaded) or expired; the app's claim will tell which.
  return ok({ accepted: await completeHandoff(id, userId) });
});
