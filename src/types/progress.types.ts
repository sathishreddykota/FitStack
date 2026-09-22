// ─────────────────────────────────────────────
// Progress & Body Tracking Types
// ─────────────────────────────────────────────

export type PhotoAngle = "FRONT" | "SIDE" | "BACK";

export type SleepQuality = "POOR" | "FAIR" | "GOOD" | "EXCELLENT";

export interface WeightLog {
  id: string;
  userId: string;
  date: Date;
  weightKg: number;
  bodyFatPercent: number | null;
  notes: string | null;
  createdAt: Date;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: Date;
  // All in cm
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  neckCm: number | null;
  leftArmCm: number | null;
  rightArmCm: number | null;
  leftThighCm: number | null;
  rightThighCm: number | null;
  leftCalfCm: number | null;
  rightCalfCm: number | null;
  shouldersCm: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaterLog {
  id: string;
  userId: string;
  date: Date;
  amountMl: number;
  loggedAt: Date;
}

export interface DailyWaterSummary {
  date: Date;
  totalMl: number;
  targetMl: number;
  percentage: number;
  logs: WaterLog[];
}

export interface SleepLog {
  id: string;
  userId: string;
  date: Date; // night of
  bedtimeAt: Date | null;
  wakeTimeAt: Date | null;
  durationMinutes: number | null;
  quality: SleepQuality | null;
  notes: string | null;
  createdAt: Date;
}

export interface HabitLog {
  id: string;
  userId: string;
  date: Date;
  stepCount: number | null;
  activeMinutes: number | null;
  mood: number | null; // 1-5 scale
  energyLevel: number | null; // 1-5 scale
  sorenessLevel: number | null; // 1-5 scale
  notes: string | null;
  createdAt: Date;
}

export interface ProgressPhoto {
  id: string;
  userId: string;
  date: Date;
  angle: PhotoAngle;
  imageUrl: string;
  weight: number | null;
  notes: string | null;
  isPrivate: boolean;
  createdAt: Date;
}

export interface WeightTrend {
  dates: Date[];
  weights: number[];
  sevenDayAverage: number[];
  trend: "GAINING" | "LOSING" | "STABLE";
  trendKgPerWeek: number;
}

export interface BodyCompositionSummary {
  currentWeight: number | null;
  targetWeight: number | null;
  startingWeight: number | null;
  weightChange: number | null;
  progressPercent: number | null;
  latestMeasurements: BodyMeasurement | null;
  trend: WeightTrend | null;
}
