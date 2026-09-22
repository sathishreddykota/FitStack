import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Stat Card — reusable metric display card
// ─────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon: LucideIcon;
  iconColor?: string;
  /** 0–100 progress percentage */
  progress?: number;
  progressColor?: string;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  subtext,
  icon: Icon,
  iconColor = "var(--color-brand-400)",
  progress,
  progressColor = "var(--color-brand-500)",
  empty = false,
  emptyMessage,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col items-start transition-all duration-200 py-4",
        className,
      )}
    >
      {/* Label & Icon Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)]">
          {label}
        </p>
      </div>

      {/* Value */}
      {empty ? (
        <p className="text-xl text-[var(--color-text-muted)] font-medium leading-snug mt-1">{emptyMessage}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">{value}</span>
            {unit && (
              <span className="text-sm text-[var(--color-text-muted)] font-medium">{unit}</span>
            )}
          </div>
          {subtext && (
            <p className="mt-2 text-sm text-[var(--color-text-muted)] font-medium">{subtext}</p>
          )}
          {typeof progress === "number" && (
            <div className="mt-4 h-1 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: progressColor,
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
