// ─────────────────────────────────────────────
// FitStack Constants
// ─────────────────────────────────────────────

// Activity level multipliers (Mifflin-St Jeor TDEE)
export const ACTIVITY_MULTIPLIERS = {
  SEDENTARY: 1.2, // Little or no exercise, desk job
  LIGHTLY_ACTIVE: 1.375, // Light exercise 1-3 days/week
  MODERATELY_ACTIVE: 1.55, // Moderate exercise 3-5 days/week
  VERY_ACTIVE: 1.725, // Hard exercise 6-7 days/week
  EXTRA_ACTIVE: 1.9, // Very hard exercise, physical job, or 2× training
} as const;

export const ACTIVITY_LEVEL_LABELS: Record<keyof typeof ACTIVITY_MULTIPLIERS, string> = {
  SEDENTARY: "Sedentary (desk job, little exercise)",
  LIGHTLY_ACTIVE: "Lightly Active (1-3 days/week)",
  MODERATELY_ACTIVE: "Moderately Active (3-5 days/week)",
  VERY_ACTIVE: "Very Active (6-7 days/week)",
  EXTRA_ACTIVE: "Extra Active (physical job or 2× training)",
};

// Calorie adjustments based on goal
export const GOAL_CALORIE_ADJUSTMENTS = {
  GAIN_MUSCLE: 300, // +300 kcal surplus
  LOSE_FAT: -400, // -400 kcal deficit
  MAINTAIN: 0,
  RECOMPOSITION: -100, // slight deficit
  GENERAL_FITNESS: 0,
} as const;

// Protein targets in g/kg of bodyweight
export const PROTEIN_TARGETS_G_PER_KG = {
  GAIN_MUSCLE: 2.0,
  LOSE_FAT: 2.2, // Higher protein to preserve muscle in deficit
  MAINTAIN: 1.6,
  RECOMPOSITION: 2.2,
  GENERAL_FITNESS: 1.6,
} as const;

// Fat as percentage of total calories (minimum floor)
export const FAT_PERCENT_OF_CALORIES = {
  GAIN_MUSCLE: 0.25,
  LOSE_FAT: 0.25,
  MAINTAIN: 0.28,
  RECOMPOSITION: 0.28,
  GENERAL_FITNESS: 0.3,
} as const;

// Water targets
export const WATER_TARGET_ML = {
  SEDENTARY: 2500,
  LIGHTLY_ACTIVE: 3000,
  MODERATELY_ACTIVE: 3000,
  VERY_ACTIVE: 3500,
  EXTRA_ACTIVE: 4000,
} as const;

// 1RM Estimation coefficients (Epley formula: weight × (1 + reps/30))
// We use Brzycki as the primary (more accurate for 1-12 rep range):
// 1RM = weight × (36 / (37 - reps))
export const ONE_RM_FORMULA = "BRZYCKI" as const;

// Key compound lifts for strength tracking
export const KEY_LIFTS = [
  "Barbell Squat",
  "Barbell Bench Press",
  "Conventional Deadlift",
  "Overhead Press",
  "Pull-up / Chin-up",
  "Barbell Row",
  "Romanian Deadlift",
] as const;

// Fitness goal labels
export const GOAL_LABELS = {
  GAIN_MUSCLE: "Gain Muscle",
  LOSE_FAT: "Lose Fat",
  MAINTAIN: "Maintain Weight",
  RECOMPOSITION: "Body Recomposition",
  GENERAL_FITNESS: "General Fitness",
} as const;

// Training style labels
export const TRAINING_STYLE_LABELS = {
  HYBRID_STRENGTH: "Hybrid Strength (Aesthetic + Strong + Athletic)",
  HYPERTROPHY: "Hypertrophy / Bodybuilding",
  STRENGTH: "Powerlifting / Strength",
  GENERAL_FITNESS: "General Fitness",
  RUNNING_STRENGTH: "Running + Strength",
} as const;

// Macro calorie values
export const CALORIES_PER_GRAM = {
  PROTEIN: 4,
  CARBS: 4,
  FAT: 9,
} as const;

// Progress photo angles
export const PHOTO_ANGLE_LABELS = {
  FRONT: "Front",
  SIDE: "Side",
  BACK: "Back",
} as const;

// Set types
export const SET_TYPE_LABELS = {
  WORKING: "Working Set",
  WARMUP: "Warm-up Set",
  DROP_SET: "Drop Set",
  FAILURE: "To Failure",
  AMRAP: "AMRAP",
} as const;

// Sleep quality labels
export const SLEEP_QUALITY_LABELS = {
  POOR: "Poor",
  FAIR: "Fair",
  GOOD: "Good",
  EXCELLENT: "Excellent",
} as const;

// Hybrid training 5-day template
export const HYBRID_5_DAY_TEMPLATE = [
  { day: 1, name: "Monday", type: "UPPER_STRENGTH", label: "Upper Strength + Hypertrophy" },
  { day: 2, name: "Tuesday", type: "LOWER_STRENGTH", label: "Lower Strength" },
  { day: 3, name: "Wednesday", type: "CONDITIONING", label: "Conditioning / Running" },
  { day: 4, name: "Thursday", type: "UPPER_HYPERTROPHY", label: "Upper Hypertrophy" },
  { day: 5, name: "Friday", type: "LOWER_HYPERTROPHY", label: "Lower Hypertrophy + Power" },
  { day: 6, name: "Saturday", type: "CARDIO", label: "Optional Cardio / Sport" },
  { day: 7, name: "Sunday", type: "RECOVERY", label: "Recovery" },
] as const;

// App navigation items
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/nutrition", label: "Nutrition", icon: "UtensilsCrossed" },
  { href: "/workout", label: "Workout", icon: "Dumbbell" },
  { href: "/progress", label: "Progress", icon: "TrendingUp" },
  { href: "/water", label: "Water", icon: "Droplets" },
  { href: "/recovery", label: "Recovery", icon: "Moon" },
  { href: "/coach", label: "AI Coach", icon: "Bot" },
  { href: "/profile", label: "Profile", icon: "User" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;

// Subscription tiers
export const SUBSCRIPTION_FEATURES = {
  FREE: [
    "Calorie & macro tracking",
    "Basic workout logging",
    "Weight tracking",
    "Water tracking",
    "Basic progress charts",
  ],
  PRO: [
    "Everything in Free",
    "AI Coach (unlimited)",
    "AI food logging",
    "Advanced analytics",
    "Advanced training plans",
    "Meal planning",
    "Progress reports",
    "Advanced insights",
  ],
  ELITE: [
    "Everything in Pro",
    "Priority AI responses",
    "Custom training plan generation",
    "Export all data",
    "Early access to new features",
  ],
} as const;

export const APP_NAME = "FitStack" as const;
export const APP_TAGLINE = "Build the body. Build the strength. Build the athlete." as const;
export const APP_DESCRIPTION =
  "Track nutrition, strength training, conditioning, recovery and progress in one place." as const;
