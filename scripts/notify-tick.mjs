// Run the notification scheduler once against a running FitStack (dev testing).
// In production the database calls /api/cron/notifications every 15 minutes instead.
//
//   node scripts/notify-tick.mjs                 → http://localhost:3000, once
//   node scripts/notify-tick.mjs --every 15      → repeat every 15 minutes
//   node scripts/notify-tick.mjs --url https://<your-domain>
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const base = opt("url", "http://localhost:3000").replace(/\/$/, "");
const every = Number(opt("every", 0));

let secret = process.env.CRON_SECRET;
if (!secret) {
  try {
    secret = readFileSync(".env.local", "utf8").match(/^CRON_SECRET=(.+)$/m)?.[1]?.trim();
  } catch {
    /* no .env.local */
  }
}
if (!secret) {
  console.error("CRON_SECRET not found (set it in .env.local or the environment).");
  process.exit(1);
}

async function tick() {
  const at = new Date().toLocaleTimeString();
  try {
    const res = await fetch(`${base}/api/cron/notifications`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
    const json = await res.json().catch(() => null);
    console.log(`[${at}] ${res.status}`, json?.data ?? json?.error ?? "");
  } catch (e) {
    console.log(`[${at}] failed:`, e.message);
  }
}

await tick();
if (every > 0) setInterval(tick, every * 60_000);
