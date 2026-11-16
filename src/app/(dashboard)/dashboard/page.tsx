import { prisma } from "@/lib/prisma";
import { requireOnboardedUser, todayOf } from "@/server/auth";
import { toDbDate } from "@/server/dates";
import { dailyTotals, getDayMeals } from "@/server/nutrition/service";
import { recoveryForDay, waterForDay } from "@/server/tracking";
import { getNutritionAnalytics, getRecentPRs, getWeightAnalytics, getWorkoutAnalytics } from "@/server/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { AIInsightCard } from "@/components/dashboard/ai-insight-card";
import { ProgressSummaryCard } from "@/components/progress/progress-summary-card";
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Scale,
  Target,
  Dumbbell,
  Moon,
  Activity,
  ArrowRight,
  Leaf,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { GOAL_LABELS, TRAINING_STYLE_LABELS } from "@/lib/constants";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your FitStack daily overview",
};

/** Adequate fibre intake (ICMR-NIN guidance ≈ 30 g/day for adults). */
const FIBER_TARGET_G = 30;

// ─────────────────────────────────────────────
// Dashboard Home — Server Component. "Today" is the user's local day.
// ─────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const profile = user.profile;
  const today = todayOf(user).str;

  const [
    todayMeals,
    todayWater,
    todayRecovery,
    lastWeightLog,
    latestWorkout,
    weightAnalytics,
    nutritionAnalytics,
    workoutAnalytics,
    recentPRs,
  ] = await Promise.all([
    getDayMeals(user.id, today),
    waterForDay(user.id, today),
    recoveryForDay(user.id, today),
    prisma.weightLog.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } }),
    prisma.workoutSession.findFirst({
      where: { userId: user.id, date: { lte: toDbDate(today) }, status: { in: ["COMPLETED", "IN_PROGRESS"] } },
      orderBy: { date: "desc" },
      include: { exercises: { select: { id: true } } },
    }),
    getWeightAnalytics(user.id, 7, today),
    getNutritionAnalytics(user.id, 7, today),
    getWorkoutAnalytics(user.id, 7, today),
    getRecentPRs(user.id),
  ]);

  const totals = dailyTotals(todayMeals);
  const todayCalories = totals.calories;
  const todayProtein = totals.proteinG;
  const todayCarbs = totals.carbsG;
  const todayFiber = totals.fiberG;
  const todayWaterMl = todayWater.totalMl;

  const calorieTarget = profile.dailyCalorieTarget;
  const proteinTarget = profile.dailyProteinTargetG;
  const carbsTarget = profile.dailyCarbsTargetG;
  const fiberTarget = FIBER_TARGET_G;
  const waterTargetL = profile.dailyWaterTargetL;

  const currentWeight = lastWeightLog?.weightKg ?? profile.currentWeightKg ?? null;
  const targetWeight = profile.targetWeightKg ?? null;

  const hasAnyMealData = todayMeals.length > 0;
  const hasWaterData = todayWater.logs.length > 0;
  const sleepMin = todayRecovery.sleep?.durationMinutes ?? null;
  const habits = todayRecovery.habits;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header ─────────────────────────── */}
      <div className="flex flex-col gap-2 pt-4 pb-8 border-b border-[var(--color-border)] mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Good {getGreeting(profile.timezone)},<br />
          <span className="text-[var(--color-brand-500)]">{user.name?.split(" ")[0] ?? "there"}</span>.
        </h1>
        <p className="mt-4 text-base font-medium text-[var(--color-text-secondary)]">
          {new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(toDbDate(today))} <span className="mx-2 text-[var(--color-border)]">|</span>{" "}
          {profile?.fitnessGoal ? GOAL_LABELS[profile.fitnessGoal as keyof typeof GOAL_LABELS] : "Let's get to work"}
          {calorieTarget && (
            <>
              <span className="mx-2 text-[var(--color-border)]">|</span>
              <span className="text-[var(--color-brand-400)]">{calorieTarget} kcal target</span>
            </>
          )}
        </p>
      </div>

      <AIInsightCard />

      {/* ── Today's Nutrition ─────────────────────── */}
      <section aria-labelledby="nutrition-heading" className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-[var(--color-border-subtle)] gap-4">
          <h2
            id="nutrition-heading"
            className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
          >
            Nutrition
          </h2>
          <Link
            href="/nutrition"
            className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-brand-400)] transition-colors"
          >
            Log Food <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Calories"
            value={hasAnyMealData ? Math.round(todayCalories) : "—"}
            unit={hasAnyMealData ? "kcal" : undefined}
            subtext={calorieTarget ? `of ${calorieTarget} kcal target` : undefined}
            icon={Flame}
            iconColor="var(--color-calories)"
            progress={
              hasAnyMealData && calorieTarget
                ? (todayCalories / calorieTarget) * 100
                : undefined
            }
            progressColor="var(--color-calories)"
            empty={!hasAnyMealData}
            emptyMessage="Start logging meals to see today's calories"
          />
          <StatCard
            label="Protein"
            value={hasAnyMealData ? `${Math.round(todayProtein)}` : "—"}
            unit={hasAnyMealData ? "g" : undefined}
            subtext={proteinTarget ? `of ${proteinTarget}g target` : undefined}
            icon={Beef}
            iconColor="var(--color-protein)"
            progress={
              hasAnyMealData && proteinTarget
                ? (todayProtein / proteinTarget) * 100
                : undefined
            }
            progressColor="var(--color-protein)"
            empty={!hasAnyMealData}
            emptyMessage="No protein logged yet"
          />
          <StatCard
            label="Carbs"
            value={hasAnyMealData ? `${Math.round(todayCarbs)}` : "—"}
            unit={hasAnyMealData ? "g" : undefined}
            subtext={carbsTarget ? `of ${carbsTarget}g target` : undefined}
            icon={Wheat}
            iconColor="var(--color-carbs)"
            progress={
              hasAnyMealData && carbsTarget ? (todayCarbs / carbsTarget) * 100 : undefined
            }
            progressColor="var(--color-carbs)"
            empty={!hasAnyMealData}
            emptyMessage="No carbs logged yet"
          />
          <StatCard
            label="Fiber"
            value={hasAnyMealData ? `${Math.round(todayFiber)}` : "—"}
            unit={hasAnyMealData ? "g" : undefined}
            subtext={fiberTarget ? `of ${fiberTarget}g target` : undefined}
            icon={Leaf}
            iconColor="var(--color-fiber)"
            progress={
              hasAnyMealData && fiberTarget ? (todayFiber / fiberTarget) * 100 : undefined
            }
            progressColor="var(--color-fiber)"
            empty={!hasAnyMealData}
            emptyMessage="No fiber logged yet"
          />
          <StatCard
            label="Water"
            value={hasWaterData ? (todayWaterMl / 1000).toFixed(1) : "—"}
            unit={hasWaterData ? "L" : undefined}
            subtext={waterTargetL ? `of ${waterTargetL.toFixed(1)}L target` : undefined}
            icon={Droplets}
            iconColor="var(--color-info-400)"
            progress={
              hasWaterData && waterTargetL
                ? (todayWaterMl / 1000 / waterTargetL) * 100
                : undefined
            }
            progressColor="var(--color-info-400)"
            empty={!hasWaterData}
            emptyMessage="No water logged yet"
          />
        </div>
      </section>

      {/* ── Body & Workout Stats ──────────────────── */}
      <div className="grid grid-cols-1 gap-12 lg:gap-16 lg:grid-cols-2 pt-6">
        {/* Body Stats */}
        <section aria-labelledby="body-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-[var(--color-border-subtle)] gap-4">
            <h2
              id="body-heading"
              className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
            >
              Body
            </h2>
            <Link
              href="/progress"
              className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-brand-400)] transition-colors"
            >
              Log Weight <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Current Weight"
              value={currentWeight ? currentWeight.toFixed(1) : "—"}
              unit={currentWeight ? "kg" : undefined}
              subtext={
                lastWeightLog
                  ? `Logged ${formatRelativeDate(lastWeightLog.date)}`
                  : profile?.currentWeightKg
                    ? "From onboarding"
                    : undefined
              }
              icon={Scale}
              iconColor="var(--color-brand-400)"
              empty={!currentWeight}
              emptyMessage="Log your first weigh-in"
            />
            <StatCard
              label="Target Weight"
              value={targetWeight ? targetWeight.toFixed(1) : "—"}
              unit={targetWeight ? "kg" : undefined}
              subtext={
                currentWeight && targetWeight
                  ? `${Math.abs(currentWeight - targetWeight).toFixed(1)} kg to go`
                  : undefined
              }
              icon={Target}
              iconColor="var(--color-accent-500)"
              empty={!targetWeight}
              emptyMessage="Set a target in your profile"
            />
          </div>
        </section>

        {/* Workout Stats */}
        <section aria-labelledby="workout-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-[var(--color-border-subtle)] gap-4">
            <h2
              id="workout-heading"
              className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
            >
              Training
            </h2>
            <Link
              href="/workout"
              className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-brand-400)] transition-colors"
            >
              Log Session <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Last Workout"
              value={
                latestWorkout
                  ? formatRelativeDate(latestWorkout.date)
                  : "—"
              }
              subtext={
                latestWorkout
                  ? `${latestWorkout.name} · ${latestWorkout.exercises.length} exercises`
                  : undefined
              }
              icon={Dumbbell}
              iconColor="var(--color-highlight-500)"
              empty={!latestWorkout}
              emptyMessage="Start logging workouts"
            />
            <StatCard
              label="Training Style"
              value={
                profile?.trainingStyle
                  ? TRAINING_STYLE_LABELS[profile.trainingStyle as keyof typeof TRAINING_STYLE_LABELS]?.split(" ")[0] ?? "—"
                  : "—"
              }
              subtext={
                profile?.trainingDaysPerWeek
                  ? `${profile.trainingDaysPerWeek} days/week`
                  : undefined
              }
              icon={Activity}
              iconColor="var(--color-success-400)"
              empty={!profile?.trainingStyle}
              emptyMessage="Complete onboarding to set style"
            />
          </div>
        </section>
      </div>

      {/* ── Goal Progress Banner ──────────────────── */}
      {profile && (
        <ProgressSummaryCard 
          goalProgress={weightAnalytics.goalProgress}
          currentWeight={weightAnalytics.currentWeight}
          targetWeight={weightAnalytics.targetWeight}
          fitnessGoal={profile.fitnessGoal}
          avgCalories={nutritionAnalytics.averages.calories}
          workoutsThisWeek={workoutAnalytics.totalWorkouts}
          recentPRCount={recentPRs.length}
        />
      )}

      {/* ── Dashboard Analytics Charts ─────────────── */}
      <DashboardCharts 
        nutritionData={nutritionAnalytics.chartData} 
        workoutData={workoutAnalytics.chartData} 
        calorieTarget={calorieTarget}
      />

      {/* ── Recovery ──────────────────────────────── */}
      <section aria-labelledby="recovery-heading" className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-[var(--color-border-subtle)] gap-4">
          <h2 id="recovery-heading" className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Recovery
          </h2>
          <Link
            href="/recovery"
            className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-brand-400)] transition-colors"
          >
            Log Metrics <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard
            label="Sleep"
            value={sleepMin != null ? `${Math.floor(sleepMin / 60)}h ${sleepMin % 60}m` : "—"}
            subtext={todayRecovery.sleep?.quality ? `Quality: ${todayRecovery.sleep.quality.toLowerCase()}` : undefined}
            icon={Moon}
            iconColor="var(--color-info-400)"
            empty={sleepMin == null}
            emptyMessage="Log sleep to track recovery"
          />
          <StatCard
            label="Mood & Energy"
            value={habits?.energyLevel ? `${habits.energyLevel}/5` : "—"}
            subtext={habits ? `Mood ${habits.mood ?? "—"}/5 · Soreness ${habits.sorenessLevel ?? "—"}/5` : undefined}
            icon={Activity}
            iconColor="var(--color-success-400)"
            empty={!habits}
            emptyMessage="Track daily readiness in Recovery"
          />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helper: greeting based on time
// ─────────────────────────────────────────────

function getGreeting(timezone: string): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(new Date()));
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
