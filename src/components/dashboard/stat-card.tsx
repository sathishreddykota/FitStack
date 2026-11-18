import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/motion/count-up";

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
  /** Goal reached: the bar turns lime with a short win pulse (Ember Night: lime = wins only). */
  goalHit?: boolean;
  className?: string;
}

/** Plain numbers ("128", "1.4", 2140) count up; anything else ("—", "5:30") shows as is. */
function Value({ value }: { value: string | number }) {
  const text = String(value);
  if (!/^\d+(\.\d+)?$/.test(text)) return <>{value}</>;
  const decimals = text.includes(".") ? text.split(".")[1].length : 0;
  return <CountUp value={Number(text)} decimals={decimals} />;
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
  goalHit = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col items-start rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 transition-colors duration-200 hover:border-[var(--color-surface-5)]",
        className,
      )}
    >
      {/* Label & Icon Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--color-text-secondary)]">
          {label}
        </p>
      </div>

      {/* Value */}
      {empty ? (
        <p className="text-sm sm:text-base text-[var(--color-text-muted)] font-medium leading-snug mt-1">{emptyMessage}</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="num text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
              <Value value={value} />
            </span>
            {unit && (
              <span className="text-xs sm:text-sm text-[var(--color-text-muted)] font-medium">{unit}</span>
            )}
          </div>
          {subtext && (
            <p className="mt-2 text-sm text-[var(--color-text-muted)] font-medium">{subtext}</p>
          )}
          {typeof progress === "number" && (
            <div className={cn("mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-surface-3)]", goalHit && "fs-win")}>
              <div
                className="fs-grow-x h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: goalHit ? "var(--color-accent-400)" : progressColor,
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
