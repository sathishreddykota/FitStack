import { timingSafeEqual } from "node:crypto";
import { HttpError, ok, route } from "@/server/http";
import { runScheduler } from "@/server/notifications/notify";

export const maxDuration = 60;

/** Only the scheduler knows CRON_SECRET (sent as "Authorization: Bearer <secret>"). */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new HttpError(503, "CRON_SECRET is not configured.", "INTERNAL");
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

// Every 15 minutes: send whatever reminders are due for each user right now.
// (Supabase pg_cron calls POST; Vercel cron calls GET — both work.)
const handler = route("/api/cron/notifications", async (req) => {
  if (!authorized(req)) throw new HttpError(401, "Unauthorized.", "UNAUTHENTICATED");
  return ok(await runScheduler());
});

export const GET = handler;
export const POST = handler;
