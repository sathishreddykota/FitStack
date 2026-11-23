import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  dueAchievements,
  dueScheduled,
  fiberTargetFor,
  goalHit,
  inQuietHours,
  isValidTime,
  type DaySnapshot,
  type NotificationKind,
} from "./rules";

const T = { calories: 2000, proteinG: 140, fatG: 60, fiberG: 28 };
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function day(over: Partial<DaySnapshot> = {}): DaySnapshot {
  return {
    today: "2026-11-18",
    minutes: at("12:00"),
    signupDay: "2026-11-10",
    mealsLogged: [],
    totals: { calories: 0, proteinG: 0, fatG: 0, fiberG: 0 },
    targets: T,
    sentToday: [],
    lastLoggedDay: "2026-11-17",
    missYouSent: false,
    yesterday: null,
    streak: 0,
    ...over,
  };
}
const kinds = (xs: { kind: NotificationKind }[]) => xs.map((x) => x.kind);

describe("helpers", () => {
  it("fiber target is 14 g per 1,000 kcal", () => {
    expect(fiberTargetFor(2000)).toBe(28);
    expect(fiberTargetFor(1800)).toBe(25);
  });

  it("quiet hours handle windows that cross midnight", () => {
    const q = { quietStart: "22:00", quietEnd: "07:30" };
    expect(inQuietHours(at("23:15"), q)).toBe(true);
    expect(inQuietHours(at("03:00"), q)).toBe(true);
    expect(inQuietHours(at("07:29"), q)).toBe(true);
    expect(inQuietHours(at("07:30"), q)).toBe(false);
    expect(inQuietHours(at("21:59"), q)).toBe(false);
    expect(inQuietHours(at("14:00"), { quietStart: "13:00", quietEnd: "15:00" })).toBe(true);
    expect(inQuietHours(at("14:00"), { quietStart: "09:00", quietEnd: "09:00" })).toBe(false);
  });

  it("validates HH:MM", () => {
    expect(isValidTime("07:30")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("7:30")).toBe(false);
    expect(isValidTime("12:60")).toBe(false);
  });

  it("protein/fiber count at or above target; calories/fat within ±10%", () => {
    const base = { calories: 2000, proteinG: 140, fatG: 60, fiberG: 28 };
    expect(goalHit("protein", { ...base, proteinG: 139.9 }, T)).toBe(false);
    expect(goalHit("protein", { ...base, proteinG: 180 }, T)).toBe(true);
    expect(goalHit("calories", { ...base, calories: 1800 }, T)).toBe(true);
    expect(goalHit("calories", { ...base, calories: 1799 }, T)).toBe(false);
    expect(goalHit("calories", { ...base, calories: 2201 }, T)).toBe(false);
    expect(goalHit("fat", { ...base, fatG: 66 }, T)).toBe(true);
    expect(goalHit("fat", { ...base, fatG: 70 }, T)).toBe(false);
  });
});

describe("meal reminders", () => {
  it("breakfast reminder at 10:30 when no breakfast is logged", () => {
    expect(kinds(dueScheduled(day({ minutes: at("10:30") })))).toEqual(["breakfast"]);
    expect(kinds(dueScheduled(day({ minutes: at("10:29") })))).toEqual([]);
  });

  it("no breakfast reminder once breakfast is logged", () => {
    expect(dueScheduled(day({ minutes: at("10:30"), mealsLogged: ["BREAKFAST"] }))).toEqual([]);
  });

  it("a late scheduler run still sends within an hour, not after", () => {
    expect(kinds(dueScheduled(day({ minutes: at("11:29") })))).toEqual(["breakfast"]);
    expect(dueScheduled(day({ minutes: at("11:30") }))).toEqual([]);
  });

  it("never sends the same reminder twice in a day", () => {
    expect(dueScheduled(day({ minutes: at("10:45"), sentToday: ["breakfast"] }))).toEqual([]);
  });

  it("lunch reminder shows calories so far", () => {
    const [x] = dueScheduled(day({ minutes: at("14:30"), mealsLogged: ["BREAKFAST"], totals: { calories: 620, proteinG: 30, fatG: 20, fiberG: 6 } }));
    expect(x.kind).toBe("lunch");
    expect(x.body).toBe("You're at 620 / 2,000 kcal today.");
    expect(x.url).toBe("/nutrition");
  });

  it("dinner reminder at 21:00", () => {
    expect(kinds(dueScheduled(day({ minutes: at("21:05"), mealsLogged: ["BREAKFAST", "LUNCH"] })))).toEqual(["dinner"]);
  });

  it("respects the meal-reminder switch and custom times", () => {
    expect(dueScheduled(day({ minutes: at("10:30") }), { ...DEFAULT_PREFS, mealReminders: false })).toEqual([]);
    expect(kinds(dueScheduled(day({ minutes: at("09:00") }), { ...DEFAULT_PREFS, breakfastAt: "09:00" }))).toEqual(["breakfast"]);
  });
});

describe("evening 'still to go' summary", () => {
  const evening = (totals: DaySnapshot["totals"]) => day({ minutes: at("21:30"), mealsLogged: ["BREAKFAST", "LUNCH", "DINNER"], totals });

  it("one combined message listing every open goal", () => {
    const [x, ...rest] = dueScheduled(evening({ calories: 1590, proteinG: 102, fatG: 48, fiberG: 19 }));
    expect(rest).toEqual([]);
    expect(x.kind).toBe("goals_left");
    expect(x.body).toBe("Still to go today: 38 g protein · 410 kcal · 9 g fiber · 12 g fat.");
  });

  it("lists only what's still open", () => {
    const [x] = dueScheduled(evening({ calories: 1950, proteinG: 150, fatG: 58, fiberG: 20 }));
    expect(x.body).toBe("Still to go today: 8 g fiber.");
  });

  it("gentle wording when over calories", () => {
    const [x] = dueScheduled(evening({ calories: 2450, proteinG: 150, fatG: 62, fiberG: 30 }));
    expect(x.title).toBe("Today's calories");
    expect(x.body).toBe("You're 450 kcal over today — no stress, tomorrow is a fresh start.");
  });

  it("nothing when every goal is hit (the achievement already celebrated it)", () => {
    expect(dueScheduled(evening({ calories: 2000, proteinG: 145, fatG: 60, fiberG: 30 }))).toEqual([]);
  });

  it("a nudge to log when nothing was logged at all (replacing a late dinner reminder)", () => {
    const xs = dueScheduled(day({ minutes: at("21:30") }));
    expect(xs).toHaveLength(1);
    const [x] = xs;
    expect(x.kind).toBe("goals_left");
    expect(x.title).toBe("Nothing logged today");
  });

  it("skipped without targets (onboarding not finished) or when switched off", () => {
    expect(dueScheduled(day({ minutes: at("21:30"), mealsLogged: ["LUNCH"], targets: null, sentToday: ["dinner"] }))).toEqual([]);
    expect(dueScheduled(evening({ calories: 100, proteinG: 1, fatG: 1, fiberG: 1 }), { ...DEFAULT_PREFS, goalReminders: false })).toEqual([]);
  });
});

describe("morning recap", () => {
  const morning = (yesterday: DaySnapshot["yesterday"], streak = 1) => day({ minutes: at("08:00"), yesterday, streak });

  it("names the biggest miss from yesterday", () => {
    const [x] = dueScheduled(morning({ calories: 1950, proteinG: 150, fatG: 60, fiberG: 20 }));
    expect(x.kind).toBe("recap");
    expect(x.body).toBe("Yesterday: 3 of 4 goals hit. Fiber was 8 g short.");
  });

  it("celebrates a streak", () => {
    const [x] = dueScheduled(morning({ calories: 2000, proteinG: 150, fatG: 60, fiberG: 30 }, 5));
    expect(x.title).toBe("5-day logging streak 🔥");
    expect(x.body).toBe("Yesterday: all 4 goals hit ✅ 5-day streak 🔥");
  });

  it("no recap when nothing was logged yesterday, or when switched off", () => {
    expect(dueScheduled(morning(null))).toEqual([]);
    expect(dueScheduled(morning({ calories: 1, proteinG: 1, fatG: 1, fiberG: 1 }), { ...DEFAULT_PREFS, morningRecap: false })).toEqual([]);
  });
});

describe("staying helpful, not spammy", () => {
  it("day 1 is quiet", () => {
    expect(dueScheduled(day({ minutes: at("10:30"), signupDay: "2026-11-18", lastLoggedDay: null }))).toEqual([]);
    expect(dueAchievements(day({ signupDay: "2026-11-18", totals: { calories: 2000, proteinG: 150, fatG: 60, fiberG: 30 } }))).toEqual([]);
  });

  it("day 2 starts reminders even if day 1 had no logging", () => {
    expect(kinds(dueScheduled(day({ minutes: at("10:30"), signupDay: "2026-11-17", lastLoggedDay: null })))).toEqual(["breakfast"]);
  });

  it("nothing during quiet hours, even if a slot is set there", () => {
    expect(dueScheduled(day({ minutes: at("22:30") }), { ...DEFAULT_PREFS, summaryAt: "22:15" })).toEqual([]);
  });

  it("master switch turns everything off", () => {
    expect(dueScheduled(day({ minutes: at("10:30") }), { ...DEFAULT_PREFS, enabled: false })).toEqual([]);
  });

  it("at most 5 a day", () => {
    const sent: NotificationKind[] = ["recap", "protein_hit", "fiber_hit", "lunch", "calories_hit"];
    expect(dueScheduled(day({ minutes: at("21:00"), sentToday: sent }))).toEqual([]);
  });

  it("after 3 days without logging: one 'We miss you' at breakfast time, then silence", () => {
    const away = day({ minutes: at("10:30"), lastLoggedDay: "2026-11-15" });
    expect(kinds(dueScheduled(away))).toEqual(["miss_you"]);
    expect(dueScheduled({ ...away, missYouSent: true })).toEqual([]);
    expect(dueScheduled({ ...away, minutes: at("21:30") })).toEqual([]);
    // 2 days away is still normal.
    expect(kinds(dueScheduled({ ...away, lastLoggedDay: "2026-11-16" }))).toEqual(["breakfast"]);
  });

  it("a user who never logged gets paused 3 days after signup", () => {
    expect(kinds(dueScheduled(day({ minutes: at("10:30"), signupDay: "2026-11-15", lastLoggedDay: null })))).toEqual(["miss_you"]);
  });
});

describe("achievements", () => {
  it("celebrates each goal once, the moment it's reached", () => {
    const s = day({ totals: { calories: 1200, proteinG: 141, fatG: 30, fiberG: 10 } });
    const [x] = dueAchievements(s);
    expect(x.kind).toBe("protein_hit");
    expect(x.title).toBe("Protein goal hit 💪");
    expect(x.body).toBe("141 / 140 g today. Great work.");
    expect(dueAchievements({ ...s, sentToday: ["protein_hit"] })).toEqual([]);
  });

  it("the last goal turns into a single 'Perfect day'", () => {
    const all = { calories: 2000, proteinG: 150, fatG: 60, fiberG: 30 };
    expect(kinds(dueAchievements(day({ totals: all, sentToday: ["protein_hit", "fiber_hit", "calories_hit"] })))).toEqual(["perfect_day"]);
    expect(kinds(dueAchievements(day({ totals: all })))).toEqual(["perfect_day"]);
    expect(dueAchievements(day({ totals: all, sentToday: ["perfect_day"] }))).toEqual([]);
  });

  it("respects the achievements switch, quiet hours and missing targets", () => {
    const s = day({ totals: { calories: 1200, proteinG: 150, fatG: 30, fiberG: 10 } });
    expect(dueAchievements(s, { ...DEFAULT_PREFS, achievements: false })).toEqual([]);
    expect(dueAchievements({ ...s, minutes: at("23:00") })).toEqual([]);
    expect(dueAchievements({ ...s, targets: null })).toEqual([]);
  });
});
