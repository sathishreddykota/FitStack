import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { HttpError, ok, parseBody, route } from "@/server/http";
import { claimHandoff } from "@/server/native-auth";

const schema = z.object({ id: z.string().min(10).max(64), verifier: z.string().min(40).max(64) });

// POST /api/native-auth/claim — the app proves it started the sign-in and gets a
// one-time Clerk sign-in token (valid 2 minutes) to finish signing in inside the app.
export const POST = route("POST /api/native-auth/claim", async (req) => {
  const { id, verifier } = await parseBody(req, schema);
  const userId = await claimHandoff(id, verifier);
  if (!userId) throw new HttpError(400, "That sign-in link has expired. Please try again.", "VALIDATION");
  const token = await (await clerkClient()).signInTokens.createSignInToken({ userId, expiresInSeconds: 120 });
  return ok({ ticket: token.token });
});
