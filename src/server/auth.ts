import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "./http";
import { getEntitlement, type Entitlement } from "./entitlements";
import { safeTimezone, userToday } from "./dates";

// ─────────────────────────────────────────────
// Auth helpers. Works for web (Clerk session cookie) and a native shell
// (Clerk "Authorization: Bearer <token>") without changes.
// ─────────────────────────────────────────────

const userInclude = { profile: true, subscription: true } satisfies Prisma.UserInclude;
export type AppUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;

async function loadCurrentUser(): Promise<AppUser | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId }, include: userInclude });
  if (existing) return existing;

  // First request after sign-up: create the DB user from Clerk data.
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  return prisma.user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      // Phone-only sign-ups have no email; keep the unique column unique.
      email: clerkUser.primaryEmailAddress?.emailAddress ?? `${clerkId}@no-email.fitstack`,
      name: clerkUser.fullName ?? clerkUser.firstName ?? null,
      avatarUrl: clerkUser.imageUrl ?? null,
    },
    update: {},
    include: userInclude,
  });
}

/** Current user (memoised per request). null when signed out. */
export const getCurrentUser = cache(loadCurrentUser);

/** For pages/layouts: redirect to sign-in when signed out. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For pages that need a finished profile. */
export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!user.onboardingComplete || !user.profile) redirect("/onboarding");
  return user as AppUser & { profile: NonNullable<AppUser["profile"]> };
}

/** For API routes: 401 JSON instead of a redirect. */
export async function requireApiUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in.", "UNAUTHENTICATED");
  return user;
}

export function entitlementOf(user: AppUser, now = new Date()): Entitlement {
  return getEntitlement(user, now);
}

/** Throws 402 PRO_REQUIRED unless the user has PRO (trial or paid). */
export function assertPro(user: AppUser): Entitlement {
  const ent = entitlementOf(user);
  if (!ent.isPro) {
    throw new HttpError(402, "This is a PRO feature. Upgrade for ₹199/month to unlock it.", "PRO_REQUIRED");
  }
  return ent;
}

export function timezoneOf(user: AppUser): string {
  return safeTimezone(user.profile?.timezone);
}

export function todayOf(user: AppUser) {
  return userToday(timezoneOf(user));
}
