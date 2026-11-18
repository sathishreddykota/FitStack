/**
 * Notification service against a real Postgres (migrated). Skipped unless TEST_DATABASE_URL is set.
 * Uses a fixed clock so the day/time logic is deterministic.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

describe.skipIf(!url)("notification service (real database)", async () => {
  const { prisma } = await import("@/lib/prisma");
  const svc = await import("./service");
  const { toDbDate } = await import("@/server/dates");

  const tag = `ntf${Date.now()}`;
  let userId = "";
  let foodId = "";
  // 2026-11-18 10:30 in India.
  const BREAKFAST_TIME = new Date("2026-11-18T05:00:00Z");

  async function log(date: string, mealType: "BREAKFAST" | "LUNCH" | "DINNER", m: { calories: number; proteinG: number; fatG: number; fiberG: number }) {
    const meal = await prisma.meal.upsert({
      where: { userId_date_mealType: { userId, date: toDbDate(date), mealType } },
      create: { userId, date: toDbDate(date), mealType },
      update: {},
    });
    await prisma.mealItem.create({ data: { mealId: meal.id, foodId, quantityG: 100, carbsG: 0, ...m } });
  }
  const fullDay = { calories: 2000, proteinG: 150, fatG: 60, fiberG: 30 };

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        clerkId: tag,
        email: `${tag}@test.local`,
        createdAt: new Date("2026-11-10T06:00:00Z"),
        profile: { create: { timezone: "Asia/Kolkata", dailyCalorieTarget: 2000, dailyProteinTargetG: 140, dailyFatTargetG: 60 } },
      },
    });
    userId = user.id;
    foodId = (await prisma.food.create({ data: { name: `${tag} food`, caloriesPer100g: 100, proteinPer100g: 10, carbsPer100g: 10, fatPer100g: 1, isPublic: false } })).id;
    // Logged 15th, 16th and 17th → 3-day streak; the 17th hit every goal.
    await log("2026-11-15", "LUNCH", { calories: 900, proteinG: 50, fatG: 30, fiberG: 8 });
    await log("2026-11-16", "LUNCH", { calories: 1000, proteinG: 60, fatG: 30, fiberG: 10 });
    await log("2026-11-17", "DINNER", fullDay);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.food.deleteMany({ where: { id: foodId } });
  });

  it("builds the day snapshot in the user's timezone", async () => {
    const s = await svc.loadDaySnapshot(userId, BREAKFAST_TIME);
    expect(s).toMatchObject({
      today: "2026-11-18",
      minutes: 10 * 60 + 30,
      signupDay: "2026-11-10",
      mealsLogged: [],
      targets: { calories: 2000, proteinG: 140, fatG: 60, fiberG: 28 },
      lastLoggedDay: "2026-11-17",
      missYouSent: false,
      yesterday: fullDay,
      streak: 3,
      sentToday: [],
    });
  });

  it("claims the breakfast reminder once, even if the scheduler runs twice", async () => {
    const first = await svc.claimScheduled(userId, BREAKFAST_TIME);
    expect(first.map((n) => n.kind)).toEqual(["breakfast"]);
    expect(await svc.claimScheduled(userId, new Date("2026-11-18T05:15:00Z"))).toEqual([]);
    const s = await svc.loadDaySnapshot(userId, BREAKFAST_TIME);
    expect(s?.sentToday).toEqual(["breakfast"]);
  });

  it("morning recap at 08:00 mentions the streak", async () => {
    const [x] = await svc.claimScheduled(userId, new Date("2026-11-18T02:30:00Z"));
    expect(x.kind).toBe("recap");
    expect(x.body).toBe("Yesterday: all 4 goals hit ✅ 3-day streak 🔥");
  });

  it("celebrates protein after a log, once", async () => {
    await log("2026-11-18", "LUNCH", { calories: 1100, proteinG: 145, fatG: 20, fiberG: 9 });
    const at = new Date("2026-11-18T08:00:00Z"); // 13:30
    expect((await svc.claimAchievements(userId, at)).map((n) => n.kind)).toEqual(["protein_hit"]);
    expect(await svc.claimAchievements(userId, at)).toEqual([]);
  });

  it("uses saved preferences", async () => {
    await prisma.notificationPrefs.create({ data: { userId, enabled: false } });
    expect((await svc.prefsFor(userId)).enabled).toBe(false);
    expect(await svc.claimScheduled(userId, new Date("2026-11-18T16:00:00Z"))).toEqual([]);
  });

  it("'We miss you' goes once after 3 quiet days, and resets after logging", async () => {
    await prisma.notificationPrefs.delete({ where: { userId } });
    const away = new Date("2026-11-21T05:00:00Z"); // 3 days after the last log, 10:30
    expect((await svc.claimScheduled(userId, away)).map((n) => n.kind)).toEqual(["miss_you"]);
    expect(await svc.claimScheduled(userId, new Date("2026-11-22T05:00:00Z"))).toEqual([]);
    expect((await svc.loadDaySnapshot(userId, away))?.missYouSent).toBe(true);
    // They come back and log on the 22nd: the nudge is armed again for a future break.
    await log("2026-11-22", "BREAKFAST", { calories: 400, proteinG: 20, fatG: 10, fiberG: 4 });
    expect((await svc.loadDaySnapshot(userId, new Date("2026-11-22T06:00:00Z")))?.missYouSent).toBe(false);
  });
});
