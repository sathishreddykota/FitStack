import { describe, expect, it } from "vitest";
import { buildPlan, chooseSplit, prescribe, type LibraryExercise } from "./plan-builder";

let n = 0;
const ex = (
  name: string,
  primaryMuscles: LibraryExercise["primaryMuscles"],
  category: LibraryExercise["category"],
  equipment: LibraryExercise["equipment"],
  isCompoundLift = false,
  isKeyLift = false,
): LibraryExercise => ({ id: `e${++n}`, name, primaryMuscles, category, equipment, isCompoundLift, isKeyLift });

const library: LibraryExercise[] = [
  ex("Barbell Back Squat", ["QUADS", "GLUTES"], "STRENGTH", "BARBELL", true, true),
  ex("Barbell Bench Press", ["CHEST"], "STRENGTH", "BARBELL", true, true),
  ex("Conventional Deadlift", ["HAMSTRINGS", "GLUTES"], "STRENGTH", "BARBELL", true, true),
  ex("Overhead Press", ["SHOULDERS"], "STRENGTH", "BARBELL", true, true),
  ex("Pull-up", ["LATS"], "STRENGTH", "BODYWEIGHT", true, true),
  ex("Barbell Row", ["BACK", "LATS"], "STRENGTH", "BARBELL", true, true),
  ex("Dumbbell Bench Press", ["CHEST"], "HYPERTROPHY", "DUMBBELL", true),
  ex("Goblet Squat", ["QUADS", "GLUTES"], "HYPERTROPHY", "DUMBBELL", true),
  ex("One-Arm Dumbbell Row", ["BACK", "LATS"], "HYPERTROPHY", "DUMBBELL", true),
  ex("Dumbbell Romanian Deadlift", ["HAMSTRINGS"], "HYPERTROPHY", "DUMBBELL", true),
  ex("Seated Dumbbell Shoulder Press", ["SHOULDERS"], "HYPERTROPHY", "DUMBBELL", true),
  ex("Dumbbell Lateral Raise", ["SHOULDERS"], "HYPERTROPHY", "DUMBBELL"),
  ex("Dumbbell Curl", ["BICEPS"], "HYPERTROPHY", "DUMBBELL"),
  ex("Tricep Rope Pushdown", ["TRICEPS"], "HYPERTROPHY", "CABLE"),
  ex("Leg Curl", ["HAMSTRINGS"], "HYPERTROPHY", "MACHINE"),
  ex("Push-up", ["CHEST"], "HYPERTROPHY", "BODYWEIGHT", true),
  ex("Bodyweight Squat", ["QUADS", "GLUTES"], "CONDITIONING", "BODYWEIGHT", true),
  ex("Inverted Row", ["BACK", "LATS"], "HYPERTROPHY", "BODYWEIGHT", true),
  ex("Glute Bridge", ["GLUTES"], "HYPERTROPHY", "BODYWEIGHT"),
  ex("Plank", ["CORE"], "STRENGTH", "BODYWEIGHT"),
  ex("Standing Calf Raise", ["CALVES"], "HYPERTROPHY", "MACHINE"),
  ex("Burpee", ["FULL_BODY"], "CONDITIONING", "BODYWEIGHT", true),
  ex("Kettlebell Swing", ["GLUTES"], "POWER", "KETTLEBELL", true),
  ex("Running", ["QUADS"], "CARDIO", "CARDIO_MACHINE"),
  ex("Rowing Machine", ["BACK"], "CARDIO", "CARDIO_MACHINE", true),
  ex("Thoracic Rotation", ["BACK"], "MOBILITY", "BODYWEIGHT"),
  ex("Romanian Deadlift", ["HAMSTRINGS", "GLUTES"], "STRENGTH", "BARBELL", true),
  ex("Leg Press", ["QUADS", "GLUTES"], "HYPERTROPHY", "MACHINE"),
  ex("Hip Thrust", ["GLUTES"], "HYPERTROPHY", "BARBELL"),
  ex("Incline Dumbbell Press", ["UPPER_CHEST"], "HYPERTROPHY", "DUMBBELL"),
  ex("Jump Rope", ["CALVES"], "CONDITIONING", "OTHER"),
  ex("Box Jump", ["QUADS", "GLUTES"], "POWER", "OTHER", true),
];
const byId = new Map(library.map((e) => [e.id, e]));

const base = { goal: "GAIN_MUSCLE", style: "HYBRID_STRENGTH", experience: "INTERMEDIATE", equipment: "GYM" } as const;

describe("chooseSplit", () => {
  it("returns exactly N training days for every style", () => {
    for (const style of ["HYBRID_STRENGTH", "HYPERTROPHY", "STRENGTH", "GENERAL_FITNESS", "RUNNING_STRENGTH"] as const) {
      for (let d = 2; d <= 7; d++) expect(chooseSplit(style, d)).toHaveLength(d);
    }
  });
});

describe("buildPlan", () => {
  it("never produces empty strength days (old bug: plans had no exercises)", () => {
    for (let d = 2; d <= 7; d++) {
      const plan = buildPlan({ ...base, daysPerWeek: d }, library);
      expect(plan.days).toHaveLength(d);
      for (const day of plan.days) expect(day.exercises.length).toBeGreaterThan(0);
    }
  });

  it("starts strength days with a key lift", () => {
    const plan = buildPlan({ ...base, daysPerWeek: 4 }, library);
    const lower = plan.days.find((x) => x.dayType === "LOWER_STRENGTH")!;
    expect(byId.get(lower.exercises[0].exerciseId)!.name).toBe("Barbell Back Squat");
    expect(lower.exercises[0].targetReps).toBe("3-5");
  });

  it("does not repeat an exercise within a day", () => {
    const plan = buildPlan({ ...base, style: "HYPERTROPHY", daysPerWeek: 6 }, library);
    for (const day of plan.days) {
      const ids = day.exercises.map((e) => e.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("respects home equipment", () => {
    const plan = buildPlan({ ...base, equipment: "BODYWEIGHT", daysPerWeek: 3 }, library);
    for (const day of plan.days) {
      for (const e of day.exercises) {
        const lib = byId.get(e.exerciseId)!;
        expect(["BODYWEIGHT", "OTHER"].includes(lib.equipment) || lib.name === "Running").toBe(true);
      }
    }
  });

  it("schedules days spread across the week", () => {
    expect(buildPlan({ ...base, daysPerWeek: 3 }, library).days.map((d) => d.dayName)).toEqual([
      "Monday",
      "Wednesday",
      "Friday",
    ]);
  });

  it("labels repeated day types A/B", () => {
    const names = buildPlan({ ...base, style: "STRENGTH", daysPerWeek: 3 }, library).days.map((d) => d.name);
    expect(names).toEqual(["Full Body A", "Full Body B", "Full Body C"]);
  });
});

describe("exercise choice quality (found testing with the full library)", () => {
  const names = (dayType: string, style = "HYBRID_STRENGTH" as const) =>
    buildPlan({ ...base, style, daysPerWeek: 4 }, library)
      .days.find((d) => d.dayType === dayType)!
      .exercises.map((e) => byId.get(e.exerciseId)!.name);

  it("keeps conditioning moves out of gym muscle slots", () => {
    for (const t of ["LOWER_STRENGTH", "LOWER_HYPERTROPHY"]) {
      const n = names(t);
      expect(n).not.toContain("Jump Rope");
      expect(n).not.toContain("Kettlebell Swing");
      expect(n).not.toContain("Box Jump");
      expect(n).not.toContain("Bodyweight Squat");
    }
    expect(names("LOWER_STRENGTH")).toContain("Standing Calf Raise");
  });

  it("uses variations, not heavy key lifts, for high-rep volume days", () => {
    const lowerHyp = names("LOWER_HYPERTROPHY");
    expect(lowerHyp).not.toContain("Conventional Deadlift");
    expect(lowerHyp.some((n) => n.includes("Romanian Deadlift"))).toBe(true);
    expect(lowerHyp).toContain("Hip Thrust");
    expect(names("UPPER_HYPERTROPHY")).not.toContain("Barbell Bench Press");
  });

  it("still starts strength days with the big lifts", () => {
    const n = names("LOWER_STRENGTH");
    expect(n[0]).toBe("Barbell Back Squat");
    expect(n).toContain("Conventional Deadlift");
  });
});

describe("prescribe", () => {
  it("gives beginners fewer sets and simple reps on main lifts", () => {
    expect(prescribe("main", { goal: "GAIN_MUSCLE", style: "STRENGTH", experience: "BEGINNER" }, "FULL_BODY")).toEqual({
      sets: 3,
      reps: "5",
    });
  });
  it("uses higher reps for fat loss accessories", () => {
    expect(prescribe("accessory", { goal: "LOSE_FAT", style: "HYPERTROPHY", experience: "INTERMEDIATE" }, "PUSH").reps).toBe(
      "12-15",
    );
  });
});
