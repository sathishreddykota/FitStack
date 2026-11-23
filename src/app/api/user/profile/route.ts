import { ok, parseBody, route } from "@/server/http";
import { entitlementOf, requireApiUser } from "@/server/auth";
import { profileUpdateSchema, updateProfile } from "@/server/profile";

// GET /api/user/profile — user, profile and plan (handy for a native client)
export const GET = route("GET /api/user/profile", async () => {
  const user = await requireApiUser();
  const { profile, subscription: _s, ...rest } = user;
  return ok({ user: rest, profile, plan: entitlementOf(user) });
});

// PATCH /api/user/profile — partial update; targets recalculated server-side
export const PATCH = route("PATCH /api/user/profile", async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, profileUpdateSchema);
  return ok(await updateProfile(user.id, body));
});

// Older clients used PUT
export const PUT = PATCH;
