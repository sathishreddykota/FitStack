import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimAchievements, claimScheduled } from "./service";
import { hasDevices, sendToUser } from "./push";

// ─────────────────────────────────────────────
// Glue between the rules (what's due) and the sender (phones).
// ─────────────────────────────────────────────

/** Check for newly reached goals and send them. Never throws. */
export async function notifyAchievements(userId: string, now = new Date()): Promise<number> {
  try {
    if (!(await hasDevices(userId))) return 0; // no phone → don't use up today's achievements
    return await sendToUser(userId, await claimAchievements(userId, now));
  } catch (e) {
    console.error("[notify] achievements failed:", e);
    return 0;
  }
}

/** Call from any route that changes what a user has eaten: checks goals once the response is sent. */
export function achievementsAfterResponse(userId: string) {
  try {
    after(() => notifyAchievements(userId));
  } catch {
    // Outside a Next.js request (scripts, tests): run in the background. Logging must never fail because of this.
    void notifyAchievements(userId);
  }
}

/** Users checked at the same time by the scheduler. */
const CONCURRENCY = 10;

/** One scheduler run: every user with a registered phone gets whatever is due for them now. */
export async function runScheduler(now = new Date()) {
  const users = await prisma.pushDevice.findMany({ distinct: ["userId"], select: { userId: true } });
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const batch = users.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(async ({ userId }) => sendToUser(userId, await claimScheduled(userId, now))));
    for (const r of results) {
      if (r.status === "fulfilled") sent += r.value;
      else {
        failed++;
        console.error("[notify] scheduler user failed:", r.reason);
      }
    }
  }
  return { users: users.length, sent, failed };
}
