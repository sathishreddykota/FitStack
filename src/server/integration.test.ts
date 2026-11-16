/**
 * End-to-end tests against a real Postgres (migrated + seeded).
 * Skipped unless TEST_DATABASE_URL is set, e.g.:
 *   TEST_DATABASE_URL=postgresql://... npm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

describe.skipIf(!url)("integration (real database)", async () => {
  const { prisma } = await import("@/lib/prisma");
  const { completeOnboarding } = await import("./profile");
  const nutrition = await import("./nutrition/service");
  const workout = await import("./workout/service");
  const tracking = await import("./tracking");
  const progress = await import("./progress");
  const { markOrderPaid } = await import("./payments");
  const { consumeAIQuota } = await import("./ai");
  const { HttpError } = await import("./http");
  const { userToday, addDays } = await import("./dates");

  const tag = `it${Date.now()}`;
  let A: { id: string };
  let B: { id: string };
  const today = userToday("Asia/Kolkata").str;

  const expectStatus = async (p: Promise<unknown>, status: number) => {
    const err = await p.then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(HttpError);
    expect((err as InstanceType<typeof HttpError>).status).toBe(status);
  };

  beforeAll(async () => {
    A = await prisma.user.create({ data: { clerkId: `${tag}-a`, email: `${tag}-a@test.local`, name: "Asha" } });
    B = await prisma.user.create({ data: { clerkId: `${tag}-b`, email: `${tag}-b@test.local`, name: "Bala" } });
    for (const u of [A, B]) {
      await completeOnboarding(u.id, {
        name: "Test",
        age: 28,
        sex: "MALE",
        heightCm: 175,
        currentWeightKg: 75,
        targetWeightKg: 70,
        fitnessGoal: "LOSE_FAT",
        activityLevel: "MODERATELY_ACTIVE",
        trainingExperience: "INTERMEDIATE",
        trainingDaysPerWeek: 4,
        trainingStyle: "HYBRID_STRENGTH",
        cardioPreference: "LIGHT",
        dietaryPreference: "NO_PREFERENCE",
        timezone: "Asia/Kolkata",
      });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { clerkId: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("onboarding computes targets and a first weigh-in", async () => {
    const p = await prisma.fitnessProfile.findUniqueOrThrow({ where: { userId: A.id } });
    expect(p.dailyCalorieTarget).toBeGreaterThan(1500);
    expect(p.dailyProteinTargetG).toBe(165); // 2.2 g/kg × 75 kg
    expect(p.timezone).toBe("Asia/Kolkata");
    expect(await prisma.weightLog.count({ where: { userId: A.id } })).toBe(1);
  });

  it("logs food by unit using real serving sizes", async () => {
    const [egg] = await nutrition.searchFoods(A.id, "Boiled Egg", 1);
    expect(egg).toBeTruthy();
    const item = await nutrition.logFood(A.id, { foodId: egg.id, mealType: "BREAKFAST", date: today, quantity: 2, unit: "piece" });
    expect(item.quantityG).toBe(100); // 2 × 50 g, not 2 g
    const totals = nutrition.dailyTotals(await nutrition.getDayMeals(A.id, today));
    expect(totals.calories).toBeGreaterThan(100);
  });

  it("blocks another user from editing or deleting a meal item", async () => {
    const [meal] = await nutrition.getDayMeals(A.id, today);
    const itemId = meal.items[0].id;
    await expectStatus(nutrition.updateMealItem(B.id, itemId, { quantity: 9, unit: "g" }), 404);
    await expectStatus(nutrition.deleteMealItem(B.id, itemId), 404);
    await nutrition.deleteMealItem(A.id, itemId);
    expect(await nutrition.getDayMeals(A.id, today)).toHaveLength(0); // empty meal cleaned up
  });

  it("saves and re-logs a meal from the log", async () => {
    const [rice] = await nutrition.searchFoods(A.id, "White Rice", 1);
    await nutrition.logFood(A.id, { foodId: rice.id, mealType: "LUNCH", date: today, quantity: 1, unit: "cup" });
    const saved = await nutrition.saveMealFromLog(A.id, { name: "Rice bowl", date: today, mealType: "LUNCH" });
    await expectStatus(nutrition.logSavedMeal(B.id, saved.id, { date: today, mealType: "DINNER" }), 404);
    expect((await nutrition.logSavedMeal(A.id, saved.id, { date: today, mealType: "DINNER" })).count).toBe(1);
  });

  it("generates a plan with exercises and schedules it", async () => {
    const plan = await workout.generatePlan(
      A.id,
      { goal: "LOSE_FAT", style: "HYBRID_STRENGTH", experience: "INTERMEDIATE", daysPerWeek: 4, equipment: "GYM" },
      today,
    );
    expect(plan?.days).toHaveLength(4);
    for (const d of plan!.days) expect(d.plannedExercises.length).toBeGreaterThan(2);
    const sessions = await workout.sessionsInRange(A.id, today, addDays(today, 27), today);
    expect(sessions.length).toBeGreaterThanOrEqual(12);
    expect(sessions[0].exercises.length).toBeGreaterThan(0);
    // Scheduling again is idempotent
    expect(await workout.scheduleWeeks(A.id, plan!.id, today, 4)).toBe(0);
  });

  it("logs sets with real ids, detects PRs, and blocks other users (old IDOR)", async () => {
    const s = await workout.createSession(A.id, { date: today, start: true });
    const bench = await prisma.exercise.findFirstOrThrow({ where: { name: "Barbell Bench Press" } });
    const ex = await workout.addExercise(A.id, s.id, bench.id, 2);
    expect(ex.sets).toHaveLength(2);

    const [s1, s2] = ex.sets;
    const first = await workout.updateSet(A.id, s1.id, { weightKg: 60, reps: 8, completed: true });
    expect(first.isPersonalRecord).toBe(true);
    const weaker = await workout.updateSet(A.id, s2.id, { weightKg: 50, reps: 5, completed: true });
    expect(weaker.isPersonalRecord).toBe(false);

    await expectStatus(workout.updateSet(B.id, s1.id, { weightKg: 999 }), 404);
    await expectStatus(workout.addSet(B.id, ex.id), 404);
    await expectStatus(workout.applySessionAction(B.id, s.id, { action: "COMPLETE" }), 404);
    expect((await prisma.workoutSet.findUniqueOrThrow({ where: { id: s1.id } })).weightKg).toBe(60);

    const s3 = await workout.addSet(A.id, ex.id);
    expect(s3.setNumber).toBe(3);
    await workout.deleteSet(A.id, s2.id);
    const nums = (await prisma.workoutSet.findMany({ where: { sessionExerciseId: ex.id }, orderBy: { setNumber: "asc" } })).map((x) => x.setNumber);
    expect(nums).toEqual([1, 2]);

    const done = await workout.applySessionAction(A.id, s.id, { action: "COMPLETE" });
    expect(done?.status).toBe("COMPLETED");
    expect(done?.durationMinutes).toBeGreaterThanOrEqual(1);

    const strength = await progress.getStrengthProgression(A.id, bench.id);
    expect(strength.allTimeMaxWeight).toBe(60);
  });

  it("grants PRO exactly once per payment and stacks renewals", async () => {
    const o1 = await prisma.paymentOrder.create({
      data: { userId: A.id, razorpayOrderId: `${tag}_o1`, amountPaise: 19900, grantDays: 30 },
    });
    await expectStatus(markOrderPaid({ razorpayOrderId: o1.razorpayOrderId, razorpayPaymentId: `${tag}_p1`, expectedUserId: B.id }), 403);
    await expectStatus(markOrderPaid({ razorpayOrderId: o1.razorpayOrderId, razorpayPaymentId: `${tag}_p1`, paidAmountPaise: 100 }), 400);

    const g1 = await markOrderPaid({ razorpayOrderId: o1.razorpayOrderId, razorpayPaymentId: `${tag}_p1`, expectedUserId: A.id });
    expect(g1.status).toBe("granted");
    const replay = await markOrderPaid({ razorpayOrderId: o1.razorpayOrderId, razorpayPaymentId: `${tag}_p1` });
    expect(replay.status).toBe("already_paid");
    expect(replay.proUntil?.getTime()).toBe(g1.proUntil?.getTime());

    const o2 = await prisma.paymentOrder.create({
      data: { userId: A.id, razorpayOrderId: `${tag}_o2`, amountPaise: 19900, grantDays: 30 },
    });
    const g2 = await markOrderPaid({ razorpayOrderId: o2.razorpayOrderId, razorpayPaymentId: `${tag}_p2` });
    const days = Math.round((g2.proUntil!.getTime() - g1.proUntil!.getTime()) / 86_400_000);
    expect(days).toBe(30);
    await expectStatus(markOrderPaid({ razorpayOrderId: "nope", razorpayPaymentId: "x" }), 404);
  });

  it("rate limits AI usage per day", async () => {
    for (let i = 0; i < 3; i++) await consumeAIQuota(B.id, "insight", "Asia/Kolkata");
    await expectStatus(consumeAIQuota(B.id, "insight", "Asia/Kolkata"), 429);
  });

  it("back-dated weigh-ins don't overwrite the current weight", async () => {
    await tracking.logWeight(B.id, { date: today, weightKg: 74 });
    await tracking.logWeight(B.id, { date: addDays(today, -10), weightKg: 77 });
    const p = await prisma.fitnessProfile.findUniqueOrThrow({ where: { userId: B.id } });
    expect(p.currentWeightKg).toBe(74);
    const w = await progress.getWeightAnalytics(B.id, 30, today);
    expect(w.startingWeight).toBe(77);
    expect(w.currentWeight).toBe(74);
  });

  it("water and recovery use the user's day", async () => {
    await tracking.logWater(B.id, today, 500);
    await tracking.logWater(B.id, today, 250);
    expect((await tracking.waterForDay(B.id, today)).totalMl).toBe(750);
    await expectStatus(tracking.deleteWater(A.id, (await tracking.waterForDay(B.id, today)).logs[0].id), 404);
    await tracking.logSleep(B.id, { date: today, durationMinutes: 450, quality: "GOOD" });
    const trend = await tracking.recoveryTrend(B.id, today);
    expect(trend.chartData.at(-1)?.sleepHours).toBe(7.5);
  });
});
