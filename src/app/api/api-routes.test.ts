/**
 * API route tests: real handlers + real Postgres, with Clerk auth simulated.
 * Skipped unless TEST_DATABASE_URL points at a migrated + seeded database.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

// ── Simulated Clerk session ─────────────────────────────────────────
const session = { clerkId: null as string | null };
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.clerkId }),
  currentUser: async () =>
    session.clerkId
      ? { primaryEmailAddress: { emailAddress: `${session.clerkId}@test.local` }, fullName: "Test User", firstName: "Test", imageUrl: null }
      : null,
}));

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function call(handler: unknown, method: string, path: string, body?: unknown, params: Record<string, string> = {}) {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const res = await (handler as Handler)(req, { params: Promise.resolve(params) });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, data: json?.data };
}

const as = (clerkId: string | null) => (session.clerkId = clerkId);

describe.skipIf(!url)("API routes", async () => {
  const { prisma } = await import("@/lib/prisma");
  const { userToday } = await import("@/server/dates");
  const R = {
    onboarding: await import("./onboarding/route"),
    profile: await import("./user/profile/route"),
    foods: await import("./nutrition/foods/route"),
    customFood: await import("./nutrition/foods/custom/route"),
    meals: await import("./nutrition/meals/route"),
    mealItem: await import("./nutrition/meals/[itemId]/route"),
    quickAdd: await import("./nutrition/meals/quick-add/route"),
    aiFood: await import("./nutrition/meals/ai/route"),
    saved: await import("./nutrition/saved-meals/route"),
    savedOne: await import("./nutrition/saved-meals/[id]/route"),
    savedLog: await import("./nutrition/saved-meals/[id]/log/route"),
    water: await import("./nutrition/water/route"),
    waterOne: await import("./nutrition/water/[id]/route"),
    weight: await import("./progress/weight/route"),
    weightOne: await import("./progress/weight/[id]/route"),
    sleep: await import("./recovery/sleep/route"),
    habits: await import("./recovery/habits/route"),
    recoveryToday: await import("./recovery/today/route"),
    exercises: await import("./workout/exercises/route"),
    plan: await import("./workout/plan/route"),
    planPreview: await import("./workout/plan/preview/route"),
    calendar: await import("./workout/calendar/route"),
    session: await import("./workout/session/route"),
    sessionOne: await import("./workout/session/[id]/route"),
    sessionEx: await import("./workout/session/[id]/exercises/route"),
    magic: await import("./workout/session/[id]/magic/route"),
    seOne: await import("./workout/session-exercises/[id]/route"),
    seSets: await import("./workout/session-exercises/[id]/sets/route"),
    set: await import("./workout/sets/[id]/route"),
    coachChat: await import("./coach/chat/route"),
    coachList: await import("./coach/conversations/route"),
    insight: await import("./coach/insight/route"),
    sub: await import("./subscription/route"),
    verify: await import("./razorpay/verify/route"),
    webhook: await import("./webhooks/razorpay/route"),
  };

  const tag = `api${Date.now()}`;
  const PRO = `${tag}-pro`; // new user → in 7-day trial
  const FREE = `${tag}-free`; // trial expired
  const OTHER = `${tag}-other`;
  const today = userToday("Asia/Kolkata").str;
  const onboarding = {
    name: "Ravi",
    age: 27,
    sex: "MALE",
    heightCm: 172,
    currentWeightKg: 72,
    targetWeightKg: 68,
    fitnessGoal: "LOSE_FAT",
    activityLevel: "LIGHTLY_ACTIVE",
    trainingExperience: "BEGINNER",
    trainingDaysPerWeek: 3,
    trainingStyle: "HYBRID_STRENGTH",
    cardioPreference: "LIGHT",
    dietaryPreference: "VEGETARIAN",
    timezone: "Asia/Kolkata",
  };

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "hook_secret";
    delete process.env.GEMINI_API_KEY;
    for (const id of [PRO, FREE, OTHER]) {
      as(id);
      const r = await call(R.onboarding.POST, "POST", "/api/onboarding", onboarding);
      expect(r.status).toBe(200);
    }
    await prisma.user.update({ where: { clerkId: FREE }, data: { createdAt: new Date(Date.now() - 30 * 86_400_000) } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { clerkId: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("rejects signed-out requests with JSON 401", async () => {
    as(null);
    const r = await call(R.meals.GET, "GET", "/api/nutrition/meals");
    expect(r.status).toBe(401);
    expect(r.json).toMatchObject({ success: false, code: "UNAUTHENTICATED" });
  });

  it("validates input", async () => {
    as(PRO);
    expect((await call(R.onboarding.POST, "POST", "/api/onboarding", { ...onboarding, age: 5 })).status).toBe(400);
    expect((await call(R.meals.POST, "POST", "/api/nutrition/meals", "{not json")).status).toBe(400);
    expect((await call(R.meals.GET, "GET", "/api/nutrition/meals?date=2026-02-30")).status).toBe(400);
    expect((await call(R.profile.PATCH, "PATCH", "/api/user/profile", { timezone: "Mars/Olympus" })).status).toBe(400);
  });

  it("profile: read, partial update recalculates targets", async () => {
    as(PRO);
    const before = await call(R.profile.GET, "GET", "/api/user/profile");
    expect(before.data.plan).toMatchObject({ isPro: true, source: "trial" });
    const r = await call(R.profile.PATCH, "PATCH", "/api/user/profile", { caloriesToOverride: 2100 });
    expect(r.status).toBe(200);
    expect(r.data.dailyCalorieTarget).toBe(2100);
    expect(r.data.age).toBe(27); // untouched fields kept
  });

  it("nutrition: search, log by unit, edit, delete, quick add, saved meals", async () => {
    as(PRO);
    const search = await call(R.foods.GET, "GET", "/api/nutrition/foods?q=chapati");
    expect(search.status).toBe(200);
    const chapati = search.data[0];
    expect(chapati.name.toLowerCase()).toContain("chapati");

    const logged = await call(R.meals.POST, "POST", "/api/nutrition/meals", {
      foodId: chapati.id,
      mealType: "LUNCH",
      date: today,
      quantity: 3,
      unit: "piece",
    });
    expect(logged.status).toBe(201);
    expect(logged.data.quantityG).toBe(120); // 3 × 40 g

    const day = await call(R.meals.GET, "GET", `/api/nutrition/meals?date=${today}`);
    expect(day.data.totals.calories).toBeGreaterThan(200);

    // another user can't touch it
    as(OTHER);
    expect((await call(R.mealItem.PATCH, "PATCH", "/x", { quantity: 1, unit: "piece" }, { itemId: logged.data.id })).status).toBe(404);
    expect((await call(R.mealItem.DELETE, "DELETE", "/x", undefined, { itemId: logged.data.id })).status).toBe(404);
    as(PRO);

    const edited = await call(R.mealItem.PATCH, "PATCH", "/x", { quantity: 2, unit: "piece" }, { itemId: logged.data.id });
    expect(edited.data.quantityG).toBe(80);

    const qa = await call(R.quickAdd.POST, "POST", "/x", { mealType: "SNACK", date: today, calories: 250, proteinG: 20 });
    expect(qa.status).toBe(201);
    // Quick Add placeholder never shows up in search
    expect((await call(R.foods.GET, "GET", "/api/nutrition/foods?q=quick%20add")).data).toHaveLength(0);

    const saved = await call(R.saved.POST, "POST", "/x", { name: "Lunch thali", fromLog: { date: today, mealType: "LUNCH" } });
    expect(saved.status).toBe(201);
    const list = await call(R.saved.GET, "GET", "/x");
    expect(list.data.map((m: { name: string }) => m.name)).toContain("Lunch thali");
    expect((await call(R.savedLog.POST, "POST", "/x", { date: today, mealType: "DINNER" }, { id: saved.data.id })).data.count).toBe(1);
    as(OTHER);
    expect((await call(R.savedOne.DELETE, "DELETE", "/x", undefined, { id: saved.data.id })).status).toBe(404);
    as(PRO);
    expect((await call(R.savedOne.DELETE, "DELETE", "/x", undefined, { id: saved.data.id })).status).toBe(200);

    const del = await call(R.mealItem.DELETE, "DELETE", "/x", undefined, { itemId: logged.data.id });
    expect(del.status).toBe(200);

    const custom = await call(R.customFood.POST, "POST", "/x", {
      name: `Amma's Upma ${tag}`,
      caloriesPer100g: 150,
      proteinPer100g: 4,
      carbsPer100g: 24,
      fatPer100g: 4,
    });
    expect(custom.status).toBe(201);
    as(OTHER);
    expect((await call(R.foods.GET, "GET", `/api/nutrition/foods?q=${encodeURIComponent(tag)}`)).data).toHaveLength(0); // private
    as(PRO);
  });

  it("water and weight", async () => {
    as(PRO);
    const w = await call(R.water.POST, "POST", "/x", { amountMl: 500 });
    expect(w.status).toBe(201);
    expect((await call(R.water.GET, "GET", "/api/nutrition/water")).data.totalMl).toBe(500);
    as(OTHER);
    expect((await call(R.waterOne.DELETE, "DELETE", "/x", undefined, { id: w.data.id })).status).toBe(404);
    as(PRO);
    expect((await call(R.waterOne.DELETE, "DELETE", "/x", undefined, { id: w.data.id })).status).toBe(200);
    expect((await call(R.water.POST, "POST", "/x", { amountMl: 5 })).status).toBe(400);

    const wt = await call(R.weight.POST, "POST", "/x", { weightKg: 71.4 });
    expect(wt.status).toBe(201);
    as(OTHER);
    expect((await call(R.weightOne.DELETE, "DELETE", "/x", undefined, { id: wt.data.id })).status).toBe(404);
  });

  it("PRO gating: free users get 402 on premium APIs, AI without a key gives 503", async () => {
    as(FREE);
    for (const [h, path, body] of [
      [R.sleep.POST, "/api/recovery/sleep", { durationMinutes: 420 }],
      [R.habits.POST, "/api/recovery/habits", { mood: 4 }],
      [R.plan.POST, "/api/workout/plan", { goal: "LOSE_FAT", style: "STRENGTH", experience: "BEGINNER", daysPerWeek: 3 }],
      [R.aiFood.POST, "/api/nutrition/meals/ai", { text: "2 idli", mealType: "BREAKFAST", date: today }],
      [R.coachChat.POST, "/api/coach/chat", { id: "conversation1", message: { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] } }],
    ] as const) {
      const r = await call(h, "POST", path, body);
      expect(r.status, path).toBe(402);
      expect(r.json.code).toBe("PRO_REQUIRED");
    }
    expect((await call(R.recoveryToday.GET, "GET", "/x")).status).toBe(402);
    expect((await call(R.insight.GET, "GET", "/x")).status).toBe(402);
    // free features still work
    expect((await call(R.water.POST, "POST", "/x", { amountMl: 250 })).status).toBe(201);

    as(PRO);
    const ai = await call(R.aiFood.POST, "POST", "/x", { text: "2 idli", mealType: "BREAKFAST", date: today });
    expect(ai.status).toBe(503);
    expect(ai.json.code).toBe("AI_UNAVAILABLE");
  });

  it("recovery for PRO users", async () => {
    as(PRO);
    expect((await call(R.sleep.POST, "POST", "/x", { durationMinutes: 450, quality: "GOOD" })).status).toBe(200);
    expect((await call(R.habits.POST, "POST", "/x", { mood: 4, energyLevel: 3, sorenessLevel: 2 })).status).toBe(200);
    const t = await call(R.recoveryToday.GET, "GET", "/x");
    expect(t.data.sleep.durationMinutes).toBe(450);
    expect(t.data.trend.chartData).toHaveLength(30);
  });

  it("workouts: preview, plan, calendar, full session logging, ownership", async () => {
    as(FREE);
    const preview = await call(R.planPreview.POST, "POST", "/x", {
      goal: "GAIN_MUSCLE",
      style: "HYPERTROPHY",
      experience: "INTERMEDIATE",
      daysPerWeek: 5,
      equipment: "DUMBBELLS",
    });
    expect(preview.status).toBe(200);
    expect(preview.data.days).toHaveLength(5);

    as(PRO);
    const plan = await call(R.plan.POST, "POST", "/x", { goal: "LOSE_FAT", style: "HYBRID_STRENGTH", experience: "BEGINNER", daysPerWeek: 3 });
    expect(plan.status).toBe(201);
    expect(plan.data.days.every((d: { plannedExercises: unknown[] }) => d.plannedExercises.length > 0)).toBe(true);
    const cal = await call(R.calendar.GET, "GET", "/api/workout/calendar");
    expect(cal.status).toBe(200);
    expect((await call(R.calendar.GET, "GET", "/api/workout/calendar?from=2026-01-01&to=2026-12-31")).status).toBe(400);

    const ex = await call(R.exercises.GET, "GET", "/api/workout/exercises?q=squat");
    const squat = ex.data.find((e: { name: string }) => e.name === "Barbell Back Squat");
    expect(squat).toBeTruthy();

    const s = await call(R.session.POST, "POST", "/x", {});
    expect(s.status).toBe(201);
    const added = await call(R.sessionEx.POST, "POST", "/x", { exerciseId: squat.id, sets: 2 }, { id: s.data.id });
    expect(added.status).toBe(201);
    const [set1] = added.data.sets;

    const done = await call(R.set.PATCH, "PATCH", "/x", { weightKg: 80, reps: 5, completed: true }, { id: set1.id });
    expect(done.data).toMatchObject({ weightKg: 80, reps: 5, isPersonalRecord: true });
    expect(done.data.completedAt).toBeTruthy();

    const extra = await call(R.seSets.POST, "POST", "/x", undefined, { id: added.data.id });
    expect(extra.data.setNumber).toBe(3);
    expect(extra.data.weightKg).toBeNull(); // copies previous set (set 2 was empty)
    expect((await call(R.set.DELETE, "DELETE", "/x", undefined, { id: extra.data.id })).status).toBe(200);

    // Another user can't read or modify this workout
    as(OTHER);
    expect((await call(R.sessionOne.GET, "GET", "/x", undefined, { id: s.data.id })).status).toBe(404);
    expect((await call(R.set.PATCH, "PATCH", "/x", { weightKg: 1 }, { id: set1.id })).status).toBe(404);
    expect((await call(R.seSets.POST, "POST", "/x", undefined, { id: added.data.id })).status).toBe(404);
    expect((await call(R.seOne.DELETE, "DELETE", "/x", undefined, { id: added.data.id })).status).toBe(404);
    expect((await call(R.sessionEx.POST, "POST", "/x", { exerciseId: squat.id }, { id: s.data.id })).status).toBe(404);
    expect((await call(R.sessionOne.PATCH, "PATCH", "/x", { action: "COMPLETE" }, { id: s.data.id })).status).toBe(404);
    as(PRO);

    const full = await call(R.sessionOne.GET, "GET", "/x", undefined, { id: s.data.id });
    expect(full.data.exercises[0].sets).toHaveLength(2);
    const fin = await call(R.sessionOne.PATCH, "PATCH", "/x", { action: "COMPLETE" }, { id: s.data.id });
    expect(fin.data.status).toBe("COMPLETED");
    expect((await call(R.sessionOne.PATCH, "PATCH", "/x", { action: "SKIP" }, { id: s.data.id })).status).toBe(409);

    // Empty workouts can't be completed
    const empty = await call(R.session.POST, "POST", "/x", {});
    expect((await call(R.sessionOne.PATCH, "PATCH", "/x", { action: "COMPLETE" }, { id: empty.data.id })).status).toBe(422);
    const moved = await call(R.sessionOne.PATCH, "PATCH", "/x", { action: "RESCHEDULE", newDate: today }, { id: empty.data.id });
    expect(moved.status).toBe(200);
    expect((await call(R.sessionOne.DELETE, "DELETE", "/x", undefined, { id: empty.data.id })).status).toBe(200);

    // AI workout log needs a key
    const m = await call(R.magic.POST, "POST", "/x", { text: "squat 3x5 at 80" }, { id: s.data.id });
    expect(m.status).toBe(503);
  });

  it("coach conversations list works", async () => {
    as(PRO);
    const r = await call(R.coachList.GET, "GET", "/x");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it("payments: verify checks signature + owner, webhook is idempotent", async () => {
    const pro = await prisma.user.findUniqueOrThrow({ where: { clerkId: PRO } });
    const order = await prisma.paymentOrder.create({
      data: { userId: pro.id, razorpayOrderId: `order_${tag}`, amountPaise: 19900, grantDays: 30 },
    });
    const sig = (o: string, p: string) => crypto.createHmac("sha256", "test_secret").update(`${o}|${p}`).digest("hex");

    as(PRO);
    const bad = await call(R.verify.POST, "POST", "/x", {
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: "pay_1",
      razorpay_signature: "deadbeef",
    });
    expect(bad.status).toBe(400);

    as(OTHER);
    const wrongUser = await call(R.verify.POST, "POST", "/x", {
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: "pay_1",
      razorpay_signature: sig(order.razorpayOrderId, "pay_1"),
    });
    expect(wrongUser.status).toBe(403);

    as(PRO);
    const ok = await call(R.verify.POST, "POST", "/x", {
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: "pay_1",
      razorpay_signature: sig(order.razorpayOrderId, "pay_1"),
    });
    expect(ok.data.status).toBe("granted");

    // Webhook for the same payment: no double grant
    const body = JSON.stringify({
      event: "order.paid",
      payload: { order: { entity: { id: order.razorpayOrderId, amount_paid: 19900 } }, payment: { entity: { id: "pay_1" } } },
    });
    const hook = async (signature: string) => {
      const res = await R.webhook.POST(new Request("http://localhost/api/webhooks/razorpay", { method: "POST", body, headers: { "x-razorpay-signature": signature } }));
      return { status: res.status, json: await res.json() };
    };
    expect((await hook("nope")).status).toBe(400);
    expect((await hook(crypto.createHmac("sha256", "hook_secret").update(body).digest("hex"))).status).toBe(200);

    const sub = await call(R.sub.GET, "GET", "/x");
    expect(sub.data.plan).toMatchObject({ isPro: true, source: "paid" });
    expect(sub.data.payments).toHaveLength(1);
    expect(sub.data.plan.daysLeft).toBeGreaterThanOrEqual(30);
    expect(sub.data.plan.daysLeft).toBeLessThanOrEqual(31);
  });
});
