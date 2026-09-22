"use client";

import Link from "next/link";
import { TrendingUp, Flame, Dumbbell, Trophy, ArrowRight } from "lucide-react";
import { GOAL_LABELS } from "@/lib/constants";

interface ProgressSummaryCardProps {
  goalProgress: number;
  currentWeight: number | null;
  targetWeight: number | null;
  fitnessGoal: string | null;
  avgCalories: number;
  workoutsThisWeek: number;
  recentPRCount: number;
}

export function ProgressSummaryCard({
  goalProgress,
  currentWeight,
  targetWeight,
  fitnessGoal,
  avgCalories,
  workoutsThisWeek,
  recentPRCount,
}: ProgressSummaryCardProps) {
  return (
    <div className="py-8 border-t border-b border-[var(--color-border)] my-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-[var(--color-border-subtle)] gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Summary
        </h2>
        <Link
          href="/progress"
          className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-brand-400)] transition-colors"
        >
          Detailed Analytics <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* Goal Progress Section */}
        <div className="flex flex-col items-start">
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--color-brand-400)]" />
            {fitnessGoal ? GOAL_LABELS[fitnessGoal as keyof typeof GOAL_LABELS] : "Progress"}
          </p>
          <div className="flex items-baseline gap-2 mt-1 mb-4">
            <span className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {currentWeight ? currentWeight.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-[var(--color-text-muted)] font-medium">kg</span>
          </div>
          {targetWeight && (
            <p className="text-sm text-[var(--color-text-muted)] font-medium mb-4">
              Targeting {targetWeight} kg · <span className="text-[var(--color-brand-400)] font-bold">{Math.round(goalProgress)}% complete</span>
            </p>
          )}
          {/* Progress Bar */}
          <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-brand-500)] transition-all duration-1000"
              style={{ width: `${Math.max(2, goalProgress)}%` }}
            />
          </div>
        </div>

        {/* Cals Section */}
        <div className="flex flex-col items-start">
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
            <Flame className="h-5 w-5 text-[var(--color-calories)]" />
            7D Avg Calories
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {avgCalories > 0 ? avgCalories : "—"}
            </span>
            <span className="text-sm text-[var(--color-text-muted)] font-medium">kcal</span>
          </div>
        </div>

        {/* Workouts & PRs Section */}
        <div className="flex flex-col items-start">
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Recent Milestones
          </p>
          <div className="flex flex-col mt-1 gap-2">
            <p className="text-lg font-medium text-[var(--color-text-secondary)]">
              <span className="text-2xl font-black text-[var(--color-text-primary)]">{workoutsThisWeek}</span> workouts this week
            </p>
            {recentPRCount > 0 && (
              <p className="text-lg font-medium text-[var(--color-text-secondary)]">
                <span className="text-2xl font-black text-[var(--color-brand-400)]">{recentPRCount}</span> new personal records
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
