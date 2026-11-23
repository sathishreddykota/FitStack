/**
 * Activity API tests: real handlers + real Postgres, Clerk auth simulated.
 * Skipped unless TEST_DATABASE_URL points at a migrated + seeded database.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

const session = { clerkId: null as string | null };
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.clerkId }),
  currentUser: async () =>
    session.clerkId
      ? { primaryEmailAddress: { emailAddress: `${session.clerkId}@test.local` }, fullName: "Runner", firstName: "Runner", imageUrl: null }
      : null,
}));

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
async function call(handler: unknown, method: string, path: string, body?: unknown, params: Record<string, string> = {}) {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await (handler as Handler)(req, { params: Promise.resolve(params) });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, data: json?.data };
}
const as = (id: string | null) => (session.clerkId = id);

const M_PER_DEG_LAT = 111_195;
/** Straight run north; `segments` = [metres, m/s] pieces, one GPS fix every 3 s. */
function run(t0: number, segments: [number, number][]) {
  const pts: { lat: number; lng: number; t: number; acc: number; alt: number }[] = [];
  let lat = 17.385;
  let t = t0;
  pts.push({ lat, lng: 78.4867, t, acc: 5, alt: 540 });
  for (const [metres, speed] of segments) {
    const steps = Math.round(metres / (speed * 3));
    for (let i = 0; i < steps; i++) {
      lat += (speed * 3) / M_PER_DEG_LAT;
      t += 3000;
      pts.push({ lat, lng: 78.4867, t, acc: 5, alt: 540 });
    }
  }
  return pts;
}

describe.skipIf(!url)("Activity API", async () => {
  const { prisma } = await import("@/lib/prisma");
  const list = await import("./activities/route");
  const one = await import("./activities/[id]/route");
  const stats = await import("./activities/stats/route");
  const onboarding = await import("./onboarding/route");

  const tag = `act${Date.now()}`;
  const ME = `${tag}-me`;
  const OTHER = `${tag}-other`;
  const FREE = `${tag}-free`;
  const now = Date.now();

  beforeAll(async () => {
    for (const id of [ME, OTHER, FREE]) {
      as(id);
      const r = await call(onboarding.POST, "POST", "/x", {
        name: "Runner", age: 30, sex: "MALE", heightCm: 175, currentWeightKg: 70, targetWeightKg: 68,
        fitnessGoal: "GENERAL_FITNESS", activityLevel: "MODERATELY_ACTIVE", trainingExperience: "INTERMEDIATE",
        trainingDaysPerWeek: 4, trainingStyle: "RUNNING_STRENGTH", cardioPreference: "MODERATE",
        dietaryPreference: "NO_PREFERENCE", timezone: "Asia/Kolkata",
      });
      expect(r.status).toBe(200);
    }
    await prisma.user.update({ where: { clerkId: FREE }, data: { createdAt: new Date(now - 30 * 86_400_000) } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { clerkId: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  let firstId = "";
  let fastId = "";

  it("requires sign-in and PRO", async () => {
    as(null);
    expect((await call(list.GET, "GET", "/api/activities")).status).toBe(401);
    as(FREE);
    const r = await call(list.POST, "POST", "/x", { source: "GPS", type: "RUN", clientId: "free-run-01", points: run(now - 3_600_000, [[1000, 3]]) });
    expect(r.status).toBe(402);
    expect((await call(stats.GET, "GET", "/x")).status).toBe(402);
  });

  it("saves a GPS run: server computes distance, splits, pace, calories and PRs", async () => {
    as(ME);
    // 6:30 am IST on 10 Nov → "Morning Run"; 5.2 km at ~5:33/km
    const r = await call(list.POST, "POST", "/x", {
      source: "GPS", type: "RUN", clientId: "run-aaaa-0001", points: run(Date.UTC(2026, 10, 10, 1, 0), [[5200, 3]]),
    });
    expect(r.status).toBe(201);
    const a = r.data.activity;
    firstId = a.id;
    expect(a.title).toBe("Morning Run");
    expect(a.day).toBeUndefined(); // raw create result; detail route adds `day`
    expect(a.distanceM).toBeGreaterThan(5150);
    expect(a.distanceM).toBeLessThan(5250);
    expect(a.splits).toHaveLength(6); // 5 full km + 200 m
    expect(a.avgPaceSecPerKm).toBeGreaterThan(320);
    expect(a.avgPaceSecPerKm).toBeLessThan(345);
    expect(a.calories).toBeGreaterThan(350); // ~1 kcal/kg/km × 70 kg × 5.2 km
    expect(a.isPrivate).toBe(true);
    expect(typeof a.polyline).toBe("string");
    expect(r.data.newPRs.map((p: { distanceM: number }) => p.distanceM)).toEqual([1000, 5000]);
  });

  it("is idempotent: re-uploading the same recording doesn't duplicate it", async () => {
    as(ME);
    const again = await call(list.POST, "POST", "/x", {
      source: "GPS", type: "RUN", clientId: "run-aaaa-0001", points: run(Date.UTC(2026, 10, 10, 1, 0), [[5200, 3]]),
    });
    expect(again.status).toBe(200);
    expect(again.data.duplicate).toBe(true);
    expect(again.data.activity.id).toBe(firstId);
    expect(await prisma.activity.count({ where: { user: { clerkId: ME } } })).toBe(1);
  });

  it("detects a new 1 km PR and moves the PR flag", async () => {
    as(ME);
    const r = await call(list.POST, "POST", "/x", {
      source: "GPS", type: "RUN", clientId: "run-bbbb-0002", points: run(now - 2 * 3_600_000, [[500, 3], [1000, 4.2], [500, 3]]),
    });
    expect(r.status).toBe(201);
    fastId = r.data.activity.id;
    expect(r.data.newPRs).toEqual([{ distanceM: 1000, timeSec: expect.any(Number) }]);
    expect(r.data.newPRs[0].timeSec).toBeLessThan(250);
    const old1k = await prisma.bestEffort.findFirstOrThrow({ where: { activityId: firstId, distanceM: 1000 } });
    expect(old1k.isPR).toBe(false);
  });

  it("rejects bad uploads", async () => {
    as(ME);
    const still = Array.from({ length: 20 }, (_, i) => ({ lat: 17.385, lng: 78.4867, t: now - 100_000 + i * 3000, acc: 5 }));
    expect((await call(list.POST, "POST", "/x", { source: "GPS", type: "RUN", clientId: "run-still-03", points: still })).status).toBe(422);
    expect((await call(list.POST, "POST", "/x", { source: "GPS", type: "RUN", clientId: "x", points: [] })).status).toBe(400);
    const tomorrow = new Date(now + 2 * 86_400_000).toISOString().slice(0, 10);
    const future = await call(list.POST, "POST", "/x", { source: "MANUAL", type: "RUN", clientId: "manual-future", date: tomorrow, startTime: "07:00", distanceM: 5000, durationSec: 1500 });
    expect(future.status).toBe(422);
  });

  it("saves manual entries (treadmill and an exact 5 km)", async () => {
    as(ME);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(now - 3 * 3_600_000));
    const tm = await call(list.POST, "POST", "/x", { source: "MANUAL", type: "TREADMILL", clientId: "manual-tm-01", date: today, distanceM: 3000, durationSec: 1080 });
    expect(tm.status).toBe(201);
    expect(tm.data.activity).toMatchObject({ source: "MANUAL", avgPaceSecPerKm: 360, polyline: null });
    const fiveK = await call(list.POST, "POST", "/x", { source: "MANUAL", type: "RUN", clientId: "manual-5k-01", date: "2026-11-01", startTime: "06:00", distanceM: 5000, durationSec: 1500 });
    expect(fiveK.status).toBe(201);
    expect(fiveK.data.newPRs).toEqual([{ distanceM: 5000, timeSec: 1500 }]); // 25:00 beats the 27:45 GPS 5 km
  });

  it("keeps activities private to their owner", async () => {
    as(OTHER);
    expect((await call(one.GET, "GET", "/x", undefined, { id: firstId })).status).toBe(404);
    expect((await call(one.PATCH, "PATCH", "/x", { title: "mine now" }, { id: firstId })).status).toBe(404);
    expect((await call(one.DELETE, "DELETE", "/x", undefined, { id: firstId })).status).toBe(404);
    expect((await call(list.GET, "GET", "/api/activities")).data.items).toHaveLength(0);
  });

  it("lists with pagination, shows detail, and edits", async () => {
    as(ME);
    const p1 = await call(list.GET, "GET", "/api/activities?limit=2");
    expect(p1.data.items).toHaveLength(2);
    expect(p1.data.nextCursor).toBeTruthy();
    const p2 = await call(list.GET, "GET", `/api/activities?limit=2&cursor=${p1.data.nextCursor}`);
    expect(p2.data.items.length).toBeGreaterThan(0);
    const ids = [...p1.data.items, ...p2.data.items].map((a: { id: string }) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect((await call(list.GET, "GET", "/api/activities?type=TREADMILL")).data.items).toHaveLength(1);

    const d = await call(one.GET, "GET", "/x", undefined, { id: firstId });
    expect(d.data.day).toBe("2026-11-10");
    expect(d.data.splits[0]).toMatchObject({ index: 0, distanceM: 1000 });

    const e = await call(one.PATCH, "PATCH", "/x", { title: "Lake loop", feel: 4, isPrivate: false }, { id: firstId });
    expect(e.data).toMatchObject({ title: "Lake loop", feel: 4, isPrivate: false });
  });

  it("reports weekly stats and personal bests", async () => {
    as(ME);
    const s = await call(stats.GET, "GET", "/x");
    expect(s.status).toBe(200);
    expect(s.data.week.count).toBeGreaterThanOrEqual(2); // today's GPS run + treadmill
    expect(s.data.weeks).toHaveLength(12);
    const pbs = s.data.personalBests.map((p: { distanceM: number; timeSec: number }) => [p.distanceM, p.timeSec]);
    expect(pbs).toContainEqual([5000, 1500]);
    expect(s.data.longestRun.distanceM).toBeGreaterThan(5000);
  });

  it("gives the coach weekly km, recent runs with splits, PRs and today's burn", async () => {
    const { runningForCoach, activitiesOnDay } = await import("@/server/activity/service");
    const { localDateString } = await import("@/server/dates");
    const me = await prisma.user.findUniqueOrThrow({ where: { clerkId: ME } });
    const today = localDateString("Asia/Kolkata");
    const r = await runningForCoach(me.id, today, 4);
    expect(r.weeklyTotals).toHaveLength(4);
    const thisWeek = r.weeklyTotals[3];
    expect(thisWeek.runs).toBeGreaterThanOrEqual(2);
    expect(thisWeek.avgRunPace).toMatch(/^\d+:\d{2}\/km$/);
    expect(r.recentActivities.length).toBeGreaterThan(0);
    const gps = r.recentActivities.find((a) => !a.manual && a.km > 1);
    expect(gps?.kmSplits.length).toBeGreaterThan(0);
    expect(r.personalBests.some((p) => p.distanceKm === 5)).toBe(true);
    // Weeks are capped so a bad tool call can't pull a huge history.
    expect((await runningForCoach(me.id, today, 500)).weeklyTotals).toHaveLength(26);

    // The latest activity's day (the test runs start hours ago, which can be yesterday just after midnight).
    const day = await activitiesOnDay(me.id, r.recentActivities[0].date);
    expect(day.items.length).toBeGreaterThan(0);
    expect(day.kcalBurned).toBe(day.items.reduce((a, i) => a + (i.kcal ?? 0), 0));
  });

  it("deleting the fastest run gives the PR back to the next best", async () => {
    as(ME);
    expect((await call(one.DELETE, "DELETE", "/x", undefined, { id: fastId })).status).toBe(200);
    const back = await prisma.bestEffort.findFirstOrThrow({ where: { activityId: firstId, distanceM: 1000 } });
    expect(back.isPR).toBe(true);
  });

  it("lets a user delete their data even after PRO ends", async () => {
    const free = await prisma.user.findUniqueOrThrow({ where: { clerkId: FREE } });
    const a = await prisma.activity.create({
      data: { userId: free.id, type: "WALK", source: "MANUAL", title: "Old walk", clientId: "old-walk-01", date: new Date("2026-10-01T00:00:00Z"), startedAt: new Date("2026-10-01T01:00:00Z"), elapsedSec: 1800, movingSec: 1800, distanceM: 2500 },
    });
    as(FREE);
    expect((await call(one.DELETE, "DELETE", "/x", undefined, { id: a.id })).status).toBe(200);
  });
});
