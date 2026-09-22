import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// Auth Helpers
// ─────────────────────────────────────────────

/**
 * Get the authenticated Clerk user ID from server context.
 * Redirects to sign-in if not authenticated.
 * Use this in Server Components and Server Actions.
 */
export async function getRequiredAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
}

/**
 * Get the authenticated Clerk user ID. Returns null if not authenticated.
 * Use this when auth is optional (e.g., landing page).
 */
export async function getOptionalAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get the full FitStack user record from the database.
 * Creates the user record if it doesn't exist yet (first login).
 * Redirects to /sign-in if not authenticated.
 */
export async function getRequiredUser() {
  const clerkUserId = await getRequiredAuth();
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  // Upsert: create user record if it's their first time
  const user = await prisma.user.upsert({
    where: { clerkId: clerkUserId },
    create: {
      clerkId: clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name: clerkUser.fullName ?? clerkUser.firstName ?? null,
      avatarUrl: clerkUser.imageUrl ?? null,
    },
    update: {
      // Keep name/avatar in sync with Clerk
      name: clerkUser.fullName ?? clerkUser.firstName ?? null,
      avatarUrl: clerkUser.imageUrl ?? null,
    },
    include: {
      profile: true,
    },
  });

  return user;
}

/**
 * Verify that a resource belongs to the authenticated user.
 * Throws an error (which results in a 403) if ownership check fails.
 *
 * IMPORTANT: Always call this before returning user-owned data from API routes.
 * Never trust client-side userId values.
 */
export async function verifyOwnership(resourceUserId: string): Promise<void> {
  const clerkUserId = await getRequiredAuth();
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  if (!user || user.id !== resourceUserId) {
    throw new Error("Unauthorized: you do not have access to this resource.");
  }
}

/**
 * Get the internal database user ID from the authenticated Clerk session.
 * This is the ID used for all database foreign keys.
 */
export async function getInternalUserId(): Promise<string> {
  const clerkUserId = await getRequiredAuth();
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  if (!user) {
    // This shouldn't happen in normal flow, but handle it gracefully
    redirect("/onboarding");
  }

  return user.id;
}
