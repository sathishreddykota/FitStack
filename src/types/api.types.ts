// ─────────────────────────────────────────────
// API Types — standard response shapes
// ─────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ─────────────────────────────────────────────
// Date Range
// ─────────────────────────────────────────────

export interface DateRange {
  from: Date;
  to: Date;
}

// ─────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────

export interface WeeklyAnalytics {
  weekStart: Date;
  weekEnd: Date;
  averageCalories: number;
  averageProteinG: number;
  averageCarbsG: number;
  averageFatG: number;
  calorieTarget: number;
  proteinTargetG: number;
  workoutCount: number;
  totalVolume: number;
  averageSleepMinutes: number;
  averageWaterMl: number;
}

export interface SmartRecommendation {
  id: string;
  type:
    | "CALORIE_DEFICIT"
    | "CALORIE_SURPLUS"
    | "LOW_PROTEIN"
    | "STRENGTH_PLATEAU"
    | "HIGH_VOLUME"
    | "WEIGHT_STAGNANT"
    | "DEHYDRATION"
    | "POOR_RECOVERY"
    | "GENERAL";
  priority: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  message: string;
  actionable: string | null;
  generatedAt: Date;
}

// ─────────────────────────────────────────────
// AI Coach Types
// ─────────────────────────────────────────────

export type AIMessageRole = "USER" | "ASSISTANT";

export interface AIConversation {
  id: string;
  userId: string;
  title: string | null;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  tokensUsed: number | null;
  createdAt: Date;
}

export interface AICoachContext {
  userProfile: {
    name: string | null;
    fitnessGoal: string | null;
    trainingStyle: string | null;
  };
  todayNutrition: {
    calories: number;
    proteinG: number;
    calorieTarget: number;
    proteinTargetG: number;
  } | null;
  recentWeight: number | null;
  targetWeight: number | null;
  weeklyCalorieAverage: number | null;
  recentWorkouts: Array<{
    name: string;
    date: Date;
    exerciseCount: number;
  }>;
  recommendations: SmartRecommendation[];
}
