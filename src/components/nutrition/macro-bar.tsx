// ─────────────────────────────────────────────
// MacroBar — linear progress bar for a macro
// ─────────────────────────────────────────────
import { cn, calcPercent } from "@/lib/utils";

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string; // CSS custom property e.g. "var(--color-protein)"
  className?: string;
}

export function MacroBar({
  label,
  current,
  target,
  unit = "g",
  color,
  className,
}: MacroBarProps) {
  const pct = calcPercent(current, target);
  const over = current > target;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {label}
        </span>
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          <span
            className={cn("font-bold", over ? "text-[var(--color-warning-400)]" : "")}
            style={{ color: over ? undefined : color }}
          >
            {Math.round(current)}
          </span>
          {" / "}
          {Math.round(target)}
          {unit}
        </span>
      </div>

      {/* Track */}
      <div className="progress-track">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: over ? "var(--color-warning-400)" : color,
          }}
        />
      </div>
    </div>
  );
}
