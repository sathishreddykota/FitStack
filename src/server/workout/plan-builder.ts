import type {
  EquipmentType,
  ExerciseCategory,
  FitnessGoal,
  MuscleGroup,
  TrainingExperience,
  TrainingStyle,
  WorkoutDayType,
} from "@prisma/client";

// ─────────────────────────────────────────────
// Training plan builder (pure, deterministic, unit tested).
// Picks a weekly split from days/week + style, then fills every day with
// exercises from the library that match the user's equipment, with
// sets × reps prescribed from goal, style and experience.
// ─────────────────────────────────────────────

export type EquipmentAccess = "GYM" | "DUMBBELLS" | "BODYWEIGHT";

export interface LibraryExercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  category: ExerciseCategory;
  equipment: EquipmentType;
  isCompoundLift: boolean;
  isKeyLift: boolean;
}

export interface PlanInputs {
  goal: FitnessGoal;
  style: TrainingStyle;
  experience: TrainingExperience;
  daysPerWeek: number; // 2–7
  equipment: EquipmentAccess;
}

export interface PlannedExerciseOut {
  exerciseId: string;
  name: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  notes?: string;
}

export interface PlannedDayOut {
  dayNumber: number; // 1 = Monday … 7 = Sunday
  dayName: string;
  dayType: WorkoutDayType;
  name: string;
  exercises: PlannedExerciseOut[];
}

export interface PlanOut {
  name: string;
  description: string;
  days: PlannedDayOut[];
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Which weekdays to train for N days/week — spread out for recovery. */
const SCHEDULE: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

export function chooseSplit(style: TrainingStyle, days: number): WorkoutDayType[] {
  const d = Math.min(7, Math.max(2, Math.round(days)));
  if (style === "RUNNING_STRENGTH") {
    const map: Record<number, WorkoutDayType[]> = {
      2: ["FULL_BODY", "CARDIO"],
      3: ["FULL_BODY", "CARDIO", "FULL_BODY"],
      4: ["FULL_BODY", "CARDIO", "LOWER_STRENGTH", "CARDIO"],
      5: ["FULL_BODY", "CARDIO", "LOWER_STRENGTH", "CARDIO", "UPPER_STRENGTH"],
      6: ["FULL_BODY", "CARDIO", "LOWER_STRENGTH", "CARDIO", "UPPER_STRENGTH", "CARDIO"],
      7: ["FULL_BODY", "CARDIO", "LOWER_STRENGTH", "CARDIO", "UPPER_STRENGTH", "CARDIO", "RECOVERY"],
    };
    return map[d];
  }
  if (style === "HYBRID_STRENGTH") {
    const map: Record<number, WorkoutDayType[]> = {
      2: ["FULL_BODY", "FULL_BODY"],
      3: ["FULL_BODY", "CONDITIONING", "FULL_BODY"],
      4: ["UPPER_STRENGTH", "LOWER_STRENGTH", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY"],
      5: ["UPPER_STRENGTH", "LOWER_STRENGTH", "CONDITIONING", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY"],
      6: ["UPPER_STRENGTH", "LOWER_STRENGTH", "CONDITIONING", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY", "CARDIO"],
      7: ["UPPER_STRENGTH", "LOWER_STRENGTH", "CONDITIONING", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY", "CARDIO", "RECOVERY"],
    };
    return map[d];
  }
  if (style === "HYPERTROPHY") {
    const map: Record<number, WorkoutDayType[]> = {
      2: ["FULL_BODY", "FULL_BODY"],
      3: ["PUSH", "PULL", "LEGS"],
      4: ["UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY"],
      5: ["PUSH", "PULL", "LEGS", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY"],
      6: ["PUSH", "PULL", "LEGS", "PUSH", "PULL", "LEGS"],
      7: ["PUSH", "PULL", "LEGS", "PUSH", "PULL", "LEGS", "RECOVERY"],
    };
    return map[d];
  }
  if (style === "STRENGTH") {
    const map: Record<number, WorkoutDayType[]> = {
      2: ["FULL_BODY", "FULL_BODY"],
      3: ["FULL_BODY", "FULL_BODY", "FULL_BODY"],
      4: ["UPPER_STRENGTH", "LOWER_STRENGTH", "UPPER_STRENGTH", "LOWER_STRENGTH"],
      5: ["UPPER_STRENGTH", "LOWER_STRENGTH", "UPPER_HYPERTROPHY", "LOWER_STRENGTH", "UPPER_STRENGTH"],
      6: ["UPPER_STRENGTH", "LOWER_STRENGTH", "UPPER_HYPERTROPHY", "UPPER_STRENGTH", "LOWER_STRENGTH", "LOWER_HYPERTROPHY"],
      7: ["UPPER_STRENGTH", "LOWER_STRENGTH", "UPPER_HYPERTROPHY", "UPPER_STRENGTH", "LOWER_STRENGTH", "LOWER_HYPERTROPHY", "RECOVERY"],
    };
    return map[d];
  }
  // GENERAL_FITNESS
  const map: Record<number, WorkoutDayType[]> = {
    2: ["FULL_BODY", "FULL_BODY"],
    3: ["FULL_BODY", "CARDIO", "FULL_BODY"],
    4: ["FULL_BODY", "CARDIO", "FULL_BODY", "CONDITIONING"],
    5: ["FULL_BODY", "CARDIO", "FULL_BODY", "CONDITIONING", "FULL_BODY"],
    6: ["UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY", "CARDIO", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY", "CONDITIONING"],
    7: ["UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY", "CARDIO", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY", "CONDITIONING", "RECOVERY"],
  };
  return map[d];
}

// ── Day templates ───────────────────────────────────────────────────

type Role = "main" | "secondary" | "accessory" | "conditioning" | "cardio" | "mobility";
interface Slot {
  muscles?: MuscleGroup[];
  categories?: ExerciseCategory[];
  role: Role;
  compound?: boolean; // true = must be compound, false = prefer isolation
}

const S = (muscles: MuscleGroup[], role: Role, compound?: boolean): Slot => ({ muscles, role, compound });
const C = (categories: ExerciseCategory[], role: Role): Slot => ({ categories, role });

const TEMPLATES: Record<WorkoutDayType, { label: string; slots: Slot[] }> = {
  UPPER_STRENGTH: {
    label: "Upper Strength",
    slots: [S(["CHEST"], "main", true), S(["BACK", "LATS"], "main", true), S(["SHOULDERS"], "secondary", true), S(["LATS"], "secondary", true), S(["TRICEPS"], "accessory", false), S(["BICEPS"], "accessory", false)],
  },
  LOWER_STRENGTH: {
    label: "Lower Strength",
    slots: [S(["QUADS"], "main", true), S(["HAMSTRINGS"], "main", true), S(["QUADS", "GLUTES"], "secondary", true), S(["HAMSTRINGS"], "accessory", false), S(["CALVES"], "accessory"), S(["CORE"], "accessory")],
  },
  UPPER_HYPERTROPHY: {
    label: "Upper Hypertrophy",
    slots: [S(["UPPER_CHEST", "CHEST"], "secondary", true), S(["LATS"], "secondary", true), S(["SHOULDERS"], "accessory", false), S(["BACK"], "secondary", true), S(["CHEST"], "accessory", false), S(["REAR_DELTS"], "accessory"), S(["BICEPS"], "accessory"), S(["TRICEPS"], "accessory")],
  },
  LOWER_HYPERTROPHY: {
    label: "Lower Hypertrophy",
    slots: [S(["QUADS", "GLUTES"], "secondary", true), S(["GLUTES"], "secondary"), S(["HAMSTRINGS"], "secondary"), S(["QUADS"], "accessory", false), S(["CALVES"], "accessory"), S(["CORE"], "accessory")],
  },
  PUSH: {
    label: "Push",
    slots: [S(["CHEST"], "main", true), S(["SHOULDERS"], "secondary", true), S(["UPPER_CHEST"], "secondary"), S(["SHOULDERS"], "accessory", false), S(["TRICEPS"], "accessory"), S(["CHEST"], "accessory", false)],
  },
  PULL: {
    label: "Pull",
    slots: [S(["BACK"], "main", true), S(["LATS"], "secondary", true), S(["BACK"], "secondary"), S(["REAR_DELTS"], "accessory"), S(["BICEPS"], "accessory"), S(["BICEPS", "FOREARMS"], "accessory")],
  },
  LEGS: {
    label: "Legs",
    slots: [S(["QUADS"], "main", true), S(["HAMSTRINGS"], "secondary", true), S(["GLUTES"], "secondary"), S(["QUADS"], "accessory", false), S(["CALVES"], "accessory"), S(["CORE"], "accessory")],
  },
  FULL_BODY: {
    label: "Full Body",
    slots: [S(["QUADS"], "main", true), S(["CHEST"], "main", true), S(["BACK", "LATS"], "secondary", true), S(["HAMSTRINGS"], "secondary"), S(["SHOULDERS"], "accessory"), S(["CORE"], "accessory")],
  },
  CONDITIONING: {
    label: "Conditioning",
    slots: [C(["POWER"], "conditioning"), C(["CONDITIONING"], "conditioning"), C(["CONDITIONING"], "conditioning"), C(["POWER", "CONDITIONING"], "conditioning"), S(["CORE"], "accessory")],
  },
  CARDIO: { label: "Cardio", slots: [C(["CARDIO"], "cardio")] },
  RECOVERY: { label: "Recovery & Mobility", slots: [C(["MOBILITY", "STRETCHING"], "mobility"), C(["MOBILITY", "STRETCHING"], "mobility"), C(["MOBILITY", "STRETCHING"], "mobility")] },
  SPORT: { label: "Sport", slots: [C(["CARDIO"], "cardio")] },
  CUSTOM: { label: "Custom", slots: [] },
};

// ── Equipment ───────────────────────────────────────────────────────

const ALLOWED: Record<EquipmentAccess, EquipmentType[] | null> = {
  GYM: null,
  DUMBBELLS: ["DUMBBELL", "KETTLEBELL", "BODYWEIGHT", "BANDS", "OTHER"],
  BODYWEIGHT: ["BODYWEIGHT", "OTHER"],
};
/** Outdoor-friendly cardio that doesn't need a machine. */
const ALWAYS_OK = new Set(["Running", "Jump Rope"]);

function equipmentOk(ex: LibraryExercise, access: EquipmentAccess) {
  const allowed = ALLOWED[access];
  return !allowed || allowed.includes(ex.equipment) || ALWAYS_OK.has(ex.name);
}

// ── Prescription ────────────────────────────────────────────────────

export function prescribe(role: Role, inputs: Pick<PlanInputs, "goal" | "style" | "experience">, dayType: WorkoutDayType) {
  const strengthDay = dayType === "UPPER_STRENGTH" || dayType === "LOWER_STRENGTH" || inputs.style === "STRENGTH";
  const expAdj = inputs.experience === "BEGINNER" ? -1 : inputs.experience === "ADVANCED" ? 1 : 0;
  const leanReps = inputs.goal === "LOSE_FAT";
  switch (role) {
    case "main":
      return strengthDay
        ? { sets: clampSets(4 + expAdj), reps: inputs.experience === "BEGINNER" ? "5" : "3-5" }
        : { sets: clampSets(3 + expAdj), reps: "6-8" };
    case "secondary":
      return { sets: clampSets(3 + Math.max(0, expAdj)), reps: strengthDay ? "6-8" : leanReps ? "10-12" : "8-12" };
    case "accessory":
      return { sets: 3, reps: leanReps ? "12-15" : "10-15" };
    case "conditioning":
      return { sets: 4, reps: "40s on / 20s off" };
    case "cardio":
      return { sets: 1, reps: inputs.goal === "LOSE_FAT" ? "30-40 min" : "20-30 min" };
    case "mobility":
      return { sets: 2, reps: "45s each side" };
  }
}

function clampSets(n: number) {
  return Math.min(6, Math.max(2, n));
}

// ── Selection ───────────────────────────────────────────────────────

interface ScoreContext {
  /** Heavy day (Upper/Lower Strength or a strength-style plan): favour the big key lifts. */
  strengthDay: boolean;
  /** Training in a gym: prefer loaded movements over bodyweight versions. */
  gym: boolean;
}

function score(ex: LibraryExercise, slot: Slot, ctx: ScoreContext): number {
  let s = 0;
  if (slot.muscles) {
    const idx = ex.primaryMuscles.findIndex((m) => slot.muscles!.includes(m));
    if (idx === -1) return -Infinity;
    s += idx === 0 ? 3 : 1; // primary target first
    if (ex.category === "CARDIO" || ex.category === "MOBILITY" || ex.category === "STRETCHING") return -Infinity;
    // Jump rope, kettlebell swings, box jumps, burpees… belong in conditioning, not muscle slots.
    if (ex.category === "CONDITIONING" || ex.category === "POWER") s -= 5;
    // In a gym, loaded versions beat bodyweight ones (except core and pull-ups/dips style key work).
    if (ctx.gym && ex.equipment === "BODYWEIGHT" && !ex.isKeyLift && !slot.muscles.includes("CORE")) s -= 2;
  }
  if (slot.categories) {
    if (!slot.categories.includes(ex.category)) return -Infinity;
    s += 2;
  }
  if (slot.compound === true && !ex.isCompoundLift) s -= 4;
  if (slot.compound === false && ex.isCompoundLift) s -= 2;
  if (slot.role === "main") s += (ex.isKeyLift ? 4 : 0) + (ex.isCompoundLift ? 2 : 0) + (ex.category === "STRENGTH" ? 1 : 0);
  if (slot.role === "secondary") s += ex.isCompoundLift ? 1 : 0;
  if (slot.role === "accessory") s += ex.isCompoundLift ? 0 : 1;
  // Volume days use variations (incline/dumbbell/RDL…) instead of repeating heavy key lifts
  // for high reps — e.g. no 10–12 rep conventional deadlifts.
  if (!ctx.strengthDay && slot.role !== "main" && ex.isKeyLift) s -= 3;
  return s;
}

function pick(
  pool: LibraryExercise[],
  slot: Slot,
  usedToday: Set<string>,
  variant: number,
  ctx: ScoreContext,
): LibraryExercise | null {
  const ranked = pool
    .filter((e) => !usedToday.has(e.id))
    .map((e) => ({ e, s: score(e, slot, ctx) }))
    .filter((x) => x.s > -Infinity)
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name));
  if (ranked.length === 0) return null;
  // Variation for repeated day types (Full Body A/B): rotate among the near-best options,
  // but keep the main lift (same key lift twice a week is good programming).
  if (slot.role === "main" || variant === 0) return ranked[0].e;
  const top = ranked.filter((x) => x.s >= ranked[0].s - 2);
  return top[variant % top.length].e;
}

export function buildPlan(inputs: PlanInputs, library: LibraryExercise[]): PlanOut {
  const days = Math.min(7, Math.max(2, Math.round(inputs.daysPerWeek)));
  const split = chooseSplit(inputs.style, days);
  const weekdays = SCHEDULE[days];
  const pool = library.filter((e) => equipmentOk(e, inputs.equipment));
  const seenTypes = new Map<WorkoutDayType, number>();

  const planned: PlannedDayOut[] = split.map((dayType, i) => {
    const variant = seenTypes.get(dayType) ?? 0;
    seenTypes.set(dayType, variant + 1);
    const tpl = TEMPLATES[dayType];
    const used = new Set<string>();
    const exercises: PlannedExerciseOut[] = [];

    for (const slot of tpl.slots) {
      const ctx = {
        strengthDay: dayType === "UPPER_STRENGTH" || dayType === "LOWER_STRENGTH" || inputs.style === "STRENGTH",
        gym: inputs.equipment === "GYM",
      };
      const ex = pick(pool, slot, used, variant, ctx);
      if (!ex) continue;
      used.add(ex.id);
      const rx = prescribe(slot.role, inputs, dayType);
      exercises.push({ exerciseId: ex.id, name: ex.name, orderIndex: exercises.length, targetSets: rx.sets, targetReps: rx.reps });
    }

    const repeats = split.filter((t) => t === dayType).length;
    const suffix = repeats > 1 ? ` ${String.fromCharCode(65 + variant)}` : "";
    return {
      dayNumber: weekdays[i],
      dayName: WEEKDAYS[weekdays[i] - 1],
      dayType,
      name: `${tpl.label}${suffix}`,
      exercises,
    };
  });

  const styleLabel: Record<TrainingStyle, string> = {
    HYBRID_STRENGTH: "Hybrid Strength",
    HYPERTROPHY: "Hypertrophy",
    STRENGTH: "Strength",
    GENERAL_FITNESS: "General Fitness",
    RUNNING_STRENGTH: "Run + Strength",
  };
  const equipLabel = { GYM: "gym", DUMBBELLS: "dumbbells", BODYWEIGHT: "bodyweight" }[inputs.equipment];

  return {
    name: `${days}-Day ${styleLabel[inputs.style]}`,
    description: `${days} sessions a week for ${inputs.experience.toLowerCase()} lifters, built for ${equipLabel} training. Add weight when you hit the top of the rep range on every set.`,
    days: planned,
  };
}
