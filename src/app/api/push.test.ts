/**
 * Push notification routes: real handlers + real Postgres, Clerk auth simulated,
 * Firebase replaced by a fake sender. Skipped unless TEST_DATABASE_URL is set.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

const session = { clerkId: null as string | null };
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.clerkId }),
  currentUser: async () => null,
}));

// Run after() callbacks straight away and let tests wait for them.
const pending: Promise<unknown>[] = [];
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => {
    pending.push(Promise.resolve().then(fn));
  },
}));
const settle = async () => {
  await Promise.all(pending.splice(0));
};

async function call(handler: unknown, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await (handler as (r: Request, c: unknown) => Promise<Response>)(req, { params: Promise.resolve({}) });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, data: json?.data };
}

describe.skipIf(!url)("push notifications API", async () => {
  const { prisma } = await import("@/lib/prisma");
  const push = await import("@/server/notifications/push");
  const { runScheduler } = await import("@/server/notifications/notify");
  const devices = await import("./push/devices/route");
  const testSend = await import("./push/test/route");
  const cron = await import("./cron/notifications/route");
  const quickAdd = await import("./nutrition/meals/quick-add/route");
  const { userToday } = await import("@/server/dates");

  const tag = `push${Date.now()}`;
  const TOKEN = `${tag}-token-aaaaaaaaaaaaaaaaaaaa`;
  const DEAD = `${tag}-dead-bbbbbbbbbbbbbbbbbbbbbb`;
  const sent: { token: string; kind: string; title: string }[] = [];
  let me = "";
  let other = "";

  beforeAll(async () => {
    push.setSender(async (m) => {
      if (m.token === DEAD) return "dead";
      sent.push({ token: m.token, kind: m.kind, title: m.title });
      return "ok";
    });
    const make = (suffix: string) =>
      prisma.user.create({
        data: {
          clerkId: `${tag}-${suffix}`,
          email: `${tag}-${suffix}@test.local`,
          onboardingComplete: true,
          createdAt: new Date(Date.now() - 7 * 86_400_000), // not their first day
          profile: { create: { timezone: "Asia/Kolkata", dailyCalorieTarget: 2000, dailyProteinTargetG: 140, dailyFatTargetG: 60 } },
          // No quiet hours, so the test passes at any time of day.
          notificationPrefs: { create: { quietStart: "00:00", quietEnd: "00:00" } },
        },
      });
    me = (await make("me")).id;
    other = (await make("other")).id;
  });

  afterAll(async () => {
    push.setSender(null);
    await prisma.user.deleteMany({ where: { id: { in: [me, other] } } });
  });

  it("registers a phone, moves it on account switch, removes it on sign-out", async () => {
    session.clerkId = null;
    expect((await call(devices.POST, "POST", "/api/push/devices", { token: TOKEN })).status).toBe(401);

    session.clerkId = `${tag}-other`;
    expect((await call(devices.POST, "POST", "/api/push/devices", { token: TOKEN })).status).toBe(200);
    session.clerkId = `${tag}-me`;
    expect((await call(devices.POST, "POST", "/api/push/devices", { token: TOKEN, platform: "android" })).status).toBe(200);
    const rows = await prisma.pushDevice.findMany({ where: { token: TOKEN } });
    expect(rows.map((r) => r.userId)).toEqual([me]);

    expect((await call(devices.POST, "POST", "/api/push/devices", { token: "short" })).status).toBe(400);
    // Someone else can't remove my phone.
    session.clerkId = `${tag}-other`;
    expect((await call(devices.DELETE, "DELETE", "/api/push/devices", { token: TOKEN })).data).toEqual({ removed: 0 });
    session.clerkId = `${tag}-me`;
    expect((await call(devices.DELETE, "DELETE", "/api/push/devices", { token: TOKEN })).data).toEqual({ removed: 1 });
    expect((await call(devices.POST, "POST", "/api/push/devices", { token: TOKEN })).status).toBe(200);
  });

  it("test notification: needs the server set up, then reaches the phone", async () => {
    session.clerkId = `${tag}-me`;
    const saved = process.env.FIREBASE_SERVICE_ACCOUNT;
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    expect((await call(testSend.POST, "POST", "/api/push/test")).status).toBe(503);
    process.env.FIREBASE_SERVICE_ACCOUNT = "configured";
    try {
      const r = await call(testSend.POST, "POST", "/api/push/test");
      expect(r.status).toBe(200);
      expect(sent.at(-1)).toMatchObject({ token: TOKEN, title: "FitStack notifications are on ✅" });
      session.clerkId = `${tag}-other`;
      expect((await call(testSend.POST, "POST", "/api/push/test")).status).toBe(409); // no phone
    } finally {
      if (saved === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT;
      else process.env.FIREBASE_SERVICE_ACCOUNT = saved;
    }
  });

  it("logging enough protein sends 'Protein goal hit' once", async () => {
    session.clerkId = `${tag}-me`;
    const date = userToday("Asia/Kolkata").str;
    const before = sent.length;
    expect((await call(quickAdd.POST, "POST", "/api/nutrition/meals/quick-add", { mealType: "LUNCH", date, calories: 900, proteinG: 150, fatG: 20 })).status).toBe(201);
    await settle();
    expect(sent.slice(before).map((s) => s.kind)).toEqual(["protein_hit"]);
    // Logging more doesn't repeat it.
    await call(quickAdd.POST, "POST", "/api/nutrition/meals/quick-add", { mealType: "SNACK", date, calories: 100, proteinG: 5 });
    await settle();
    expect(sent.slice(before).map((s) => s.kind)).toEqual(["protein_hit"]);
  });

  it("scheduler route is locked behind CRON_SECRET", async () => {
    const saved = process.env.CRON_SECRET;
    try {
      delete process.env.CRON_SECRET;
      expect((await call(cron.POST, "POST", "/api/cron/notifications")).status).toBe(503);
      process.env.CRON_SECRET = "s3cret-value";
      expect((await call(cron.POST, "POST", "/api/cron/notifications")).status).toBe(401);
      expect((await call(cron.GET, "GET", "/api/cron/notifications", undefined, { authorization: "Bearer wrong-value" })).status).toBe(401);
      const r = await call(cron.GET, "GET", "/api/cron/notifications", undefined, { authorization: "Bearer s3cret-value" });
      expect(r.status).toBe(200);
      expect(r.data).toMatchObject({ failed: 0 });
    } finally {
      if (saved === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = saved;
    }
  });

  it("scheduler sends due reminders and cleans up uninstalled phones", async () => {
    await prisma.pushDevice.create({ data: { userId: other, token: DEAD } });
    // Tomorrow 10:30 in India: nothing logged yet, so breakfast is due for both users.
    const tomorrow = new Date(Date.now() + 86_400_000);
    const day = userToday("Asia/Kolkata", tomorrow).str;
    const at = new Date(`${day}T05:00:00Z`);
    const before = sent.length;
    const r = await runScheduler(at);
    expect(r.failed).toBe(0);
    expect(sent.slice(before).filter((s) => s.token === TOKEN).map((s) => s.kind)).toEqual(["breakfast"]);
    // The other user's phone was uninstalled: its token is gone.
    expect(await prisma.pushDevice.count({ where: { token: DEAD } })).toBe(0);
    // A second run at 10:45 sends nothing new.
    const again = sent.length;
    await runScheduler(new Date(`${day}T05:15:00Z`));
    expect(sent.length).toBe(again);
  });
});
