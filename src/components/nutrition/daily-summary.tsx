// ─────────────────────────────────────────────
// DailySummary — top macro overview card
// ─────────────────────────────────────────────
import { Flame } from "lucide-react";
import { MacroBar } from "./macro-bar";
import { cn, calcPercent } from "@/lib/utils";

interface DailySummaryProps {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

export function DailySummary({
  calories,
  proteinG,
  carbsG,
  fatG,
  fiberG,
  calorieTarget,
  proteinTarget,
  carbsTarget,
  fatTarget,
}: DailySummaryProps) {
  const caloriePct = calcPercent(calories, calorieTarget);
  const remaining = Math.max(calorieTarget - calories, 0);
  const over = calories > calorieTarget;

  return (
    <div className="rounded-3xl border-none bg-white p-8 shadow-card relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-brand-500)] opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
      
      {/* Header and circular progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-8 relative z-10">
        <div className="flex-1">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
            Daily Wellness
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-serif font-bold text-[var(--color-text-primary)]">
              {Math.round(calories)}
            </span>
            <span className="text-lg text-[var(--color-text-muted)] font-medium">
              / {calorieTarget} kcal
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--color-brand-500)]">
            {over
              ? `${Math.round(calories - calorieTarget)} kcal over target`
              : `${Math.round(remaining)} kcal remaining today`}
          </p>
        </div>

        {/* Circular calorie ring */}
        <div className="relative flex-shrink-0 h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
            {/* Track */}
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="var(--color-surface-2)"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={over ? "var(--color-warning-500)" : "var(--color-brand-500)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - Math.min(caloriePct, 100) / 100)}`}
              className="transition-all duration-1000 ease-spring"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame
              className="h-6 w-6 mb-0.5"
              style={{ color: over ? "var(--color-warning-500)" : "var(--color-brand-500)" }}
            />
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              {Math.round(caloriePct)}%
            </span>
          </div>
        </div>
      </div>

      {/* Macro Stats - Minimalist Layout */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 relative z-10 pt-6 border-t border-[var(--color-border-subtle)]">
        {[
          { label: "Protein", current: proteinG, target: proteinTarget, color: "var(--color-protein)" },
          { label: "Carbs", current: carbsG, target: carbsTarget, color: "var(--color-carbs)" },
          { label: "Fat", current: fatG, target: fatTarget, color: "var(--color-fat)" },
          ...(fiberG > 0 ? [{ label: "Fiber", current: fiberG, target: 30, color: "var(--color-fiber)" }] : []),
        ].map(({ label, current, target, color }, idx) => (
          <div key={label} className={cn("flex flex-col", idx === 3 ? "hidden sm:flex" : "")}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-xs font-bold text-[var(--color-text-primary)] tracking-wide">{label}</span>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-lg font-semibold text-[var(--color-text-primary)]">{Math.round(current)}</span>
              <span className="text-xs text-[var(--color-text-muted)]">/ {target}g</span>
            </div>
            
            {/* Minimal Progress Bar */}
            <div className="h-1.5 w-full bg-[var(--color-surface-2)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.min((current / target) * 100, 100)}%`,
                  backgroundColor: color
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
