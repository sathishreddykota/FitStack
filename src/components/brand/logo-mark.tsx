import { cn } from "@/lib/utils";

/** FitStack's mark: the "#" stack on an Ember square. Decorative next to the word "FitStack". */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("brand-gradient inline-flex shrink-0 items-center justify-center rounded-[28%] text-[var(--color-on-brand)]", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" style={{ width: size * 0.6, height: size * 0.6 }}>
        <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 8h12M6 16h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
