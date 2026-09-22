// ─────────────────────────────────────────────
// Workout & Training Types
// ─────────────────────────────────────────────

export type MuscleGroup =
  | "CHEST"
  | "UPPER_CHEST"
  | "BACK"
  | "LATS"
  | "SHOULDERS"
  | "FRONT_DELTS"
  | "REAR_DELTS"
  | "BICEPS"
  | "TRICEPS"
  | "FOREARMS"
  | "QUADS"
  | "HAMSTRINGS"
  | "GLUTES"
  | "CALVES"
  | "CORE"
  | "TRAPS"
  | "FULL_BODY";

export type ExerciseCategory =
  | "STRENGTH"
  | "HYPERTROPHY"
  | "POWER"
  | "CARDIO"
  | "CONDITIONING"
  | "MOBILITY"
  | "STRETCHING";

export type EquipmentType =
  | "BARBELL"
  | "DUMBBELL"
  | "KETTLEBELL"
  | "CABLE"
  | "MACHINE"
  | "BODYWEIGHT"
  | "BANDS"
  | "CARDIO_MACHINE"
  | "OTHER";

export type WorkoutDayType =
  | "UPPER_STRENGTH"
  | "LOWER_STRENGTH"
  | "UPPER_HYPERTROPHY"
  | "LOWER_HYPERTROPHY"
  | "PUSH"
  | "PULL"
  | "LEGS"
  | "FULL_BODY"
  | "CONDITIONING"
  | "CARDIO"
  | "RECOVERY"
  | "SPORT"
  | "CUSTOM";

export type SetType = "WORKING" | "WARMUP" | "DROP_SET" | "FAILURE" | "AMRAP";

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  category: ExerciseCategory;
  equipment: EquipmentType;
  isCompoundLift: boolean;
  // For strength tracking — e.g. Squat, Bench, Deadlift, OHP, Pull-up
  isKeyLift: boolean;
  videoUrl: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutSet {
  id: string;
  sessionExerciseId: string;
  setNumber: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null; // for timed sets (planks, etc.)
  distanceM: number | null; // for running/cardio
  rpe: number | null; // 1-10 Rate of Perceived Exertion
  restSeconds: number | null;
  notes: string | null;
  isPersonalRecord: boolean;
  completedAt: Date | null;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  exercise: Exercise;
  orderIndex: number;
  sets: WorkoutSet[];
  targetSets: number | null;
  targetReps: string | null; // e.g. "8-12"
  targetWeightKg: number | null;
  notes: string | null;
  // Calculated
  totalVolume: number; // sum of weight × reps
  estimatedOneRepMax: number | null;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  trainingPlanId: string | null;
  workoutDayId: string | null;
  dayType: WorkoutDayType;
  name: string;
  date: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMinutes: number | null;
  exercises: SessionExercise[];
  notes: string | null;
  // Calculated
  totalVolume: number;
  totalSets: number;
  personalRecordsSet: number;
}

export interface TrainingPlan {
  id: string;
  userId: string | null; // null = system template
  name: string;
  description: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  trainingStyle: string;
  difficultyLevel: string;
  isTemplate: boolean;
  isActive: boolean;
  days: WorkoutDay[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutDay {
  id: string;
  planId: string;
  dayNumber: number; // 1-7
  dayName: string; // "Monday", "Day 1", etc.
  dayType: WorkoutDayType;
  name: string; // "Upper Strength + Hypertrophy"
  plannedExercises: PlannedExercise[];
  isRestDay: boolean;
  notes: string | null;
}

export interface PlannedExercise {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  exercise: Exercise;
  orderIndex: number;
  targetSets: number;
  targetReps: string; // "8-12", "5", "3x5"
  targetWeightKg: number | null;
  notes: string | null;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  estimatedOneRepMax: number;
  achievedAt: Date;
}

export interface StrengthProgress {
  exerciseId: string;
  exerciseName: string;
  history: {
    date: Date;
    weightKg: number;
    reps: number;
    estimatedOneRepMax: number;
    volume: number;
  }[];
  currentPR: PersonalRecord | null;
  previousPR: PersonalRecord | null;
}
