import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { completeOnboarding, onboardingRequestSchema } from "@/server/profile";

// POST /api/onboarding — save profile, compute targets, mark onboarding complete
export const POST = route("POST /api/onboarding", async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, onboardingRequestSchema);
  await completeOnboarding(user.id, body);
  return ok({ redirectTo: "/dashboard" });
});
