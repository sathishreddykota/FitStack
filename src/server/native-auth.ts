import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// Google sign-in for the Android app.
//
// Google refuses to sign in inside an app's web view, so the app opens a
// browser tab for it and then needs the session handed back. The hand-off is
// built so that nothing passing through the browser or the "return to app"
// link is enough to sign in on its own:
//
//   1. app      → begin():   gets { id, verifier }. verifier never leaves the app.
//   2. tab      → Google sign-in → complete(id, clerkUserId)
//   3. tab      → back to the app with only `id`
//   4. app      → claim(id, verifier) → Clerk user id, once → one-time sign-in token
// ─────────────────────────────────────────────

/** How long a sign-in attempt stays usable (Google + typing a password). */
export const HANDOFF_TTL_MS = 10 * 60_000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("base64url");

export async function beginHandoff(now = new Date()) {
  const verifier = randomBytes(32).toString("base64url");
  // Housekeeping: old attempts are useless; drop them as new ones start.
  await prisma.nativeAuthRequest.deleteMany({ where: { expiresAt: { lt: now } } });
  const row = await prisma.nativeAuthRequest.create({
    data: { verifierHash: sha256(verifier), expiresAt: new Date(now.getTime() + HANDOFF_TTL_MS) },
    select: { id: true },
  });
  return { id: row.id, verifier };
}

/**
 * The browser tab finished Google sign-in as `clerkUserId`. Only the first
 * completion counts, and only before expiry. Returns whether it was accepted.
 */
export async function completeHandoff(id: string, clerkUserId: string, now = new Date()): Promise<boolean> {
  const { count } = await prisma.nativeAuthRequest.updateMany({
    where: { id, clerkUserId: null, expiresAt: { gt: now } },
    data: { clerkUserId, completedAt: now },
  });
  return count === 1;
}

/**
 * The app proves it started this attempt (verifier) and takes the result.
 * One use only: the row is deleted. Returns the Clerk user id, or null.
 */
export async function claimHandoff(id: string, verifier: string, now = new Date()): Promise<string | null> {
  const row = await prisma.nativeAuthRequest.findUnique({ where: { id } });
  if (!row || !row.clerkUserId || row.expiresAt <= now) return null;
  const a = Buffer.from(sha256(verifier));
  const b = Buffer.from(row.verifierHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  // Delete-then-return: if two claims race, only one deletes the row.
  const { count } = await prisma.nativeAuthRequest.deleteMany({ where: { id, verifierHash: row.verifierHash } });
  return count === 1 ? row.clerkUserId : null;
}
