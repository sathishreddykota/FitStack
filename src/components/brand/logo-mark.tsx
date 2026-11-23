import { cn } from "@/lib/utils";

/**
 * Daystrong's mark — the Ring: a goal ring almost closed, with a lime dot about
 * to land (the same rings that fill up across the app). Drawn in Night on an
 * Ember tile. Decorative next to the word "Daystrong", so hidden from screen readers.
 *
 * Geometry (100-unit box), shared with the app icons (scripts/make-icons.py):
 * ring r=29, stroke 12, 76% of the circle from 12 o'clock clockwise; dot r=7 at (35.5, 24.9).
 */
export function RingMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r="29"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="76 24"
        transform="rotate(-90 50 50)"
      />
      <circle cx="35.5" cy="24.9" r="7" fill="var(--color-accent-400)" />
    </svg>
  );
}

/** The Ring on an Ember tile (app icon look). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("brand-gradient inline-flex shrink-0 items-center justify-center rounded-[28%] text-[var(--color-on-brand)]", className)}
      style={{ width: size, height: size }}
    >
      <RingMark size={Math.round(size * 0.7)} />
    </span>
  );
}
