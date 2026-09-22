// ─────────────────────────────────────────────
// User & Profile Types
// ─────────────────────────────────────────────

export type Sex = "MALE" | "FEMALE" | "OTHER";

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHTLY_ACTIVE"
  | "MODERATELY_ACTIVE"
  | "VERY_ACTIVE"
  | "EXTRA_ACTIVE";

export type FitnessGoal =
  | "GAIN_MUSCLE"
  | "LOSE_FAT"
  | "MAINTAIN"
  | "RECOMPOSITION"
  | "GENERAL_FITNESS";

export type TrainingStyle =
  | "HYBRID_STRENGTH"
  | "HYPERTROPHY"
  | "STRENGTH"
  | "GENERAL_FITNESS"
  | "RUNNING_STRENGTH";

export type TrainingExperience = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type CardioPreference = "NONE" | "LIGHT" | "MODERATE" | "HEAVY";

export type DietaryPreference =
  | "NO_PREFERENCE"
  | "VEGETARIAN"
  | "VEGAN"
  | "PESCATARIAN"
  | "KETO"
  | "HIGH_PROTEIN";

export type SubscriptionTier = "FREE" | "PRO" | "ELITE";

export interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  onboardingComplete: boolean;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
  profile: FitnessProfile | null;
}

export interface FitnessProfile {
  id: string;
  userId: string;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel | null;
  fitnessGoal: FitnessGoal | null;
  trainingStyle: TrainingStyle | null;
  trainingExperience: TrainingExperience | null;
  trainingDaysPerWeek: number | null;
  cardioPreference: CardioPreference | null;
  dietaryPreference: DietaryPreference | null;
  // Calculated targets (stored for display/reference)
  dailyCalorieTarget: number | null;
  dailyProteinTargetG: number | null;
  dailyCarbsTargetG: number | null;
  dailyFatTargetG: number | null;
  dailyWaterTargetL: number | null;
  // Manual overrides
  caloriesToOverride: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingData {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  fitnessGoal: FitnessGoal;
  activityLevel: ActivityLevel;
  trainingExperience: TrainingExperience;
  trainingDaysPerWeek: number;
  trainingStyle: TrainingStyle;
  cardioPreference: CardioPreference;
  dietaryPreference: DietaryPreference;
}
