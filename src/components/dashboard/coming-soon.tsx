import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

// ─────────────────────────────────────────────
// Shared Coming-Soon Page Shell
// ─────────────────────────────────────────────

export function ComingSoonPage({
  title,
  description,
  icon,
  phase,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  phase: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        {icon}
      </div>
      <span className="mb-2 inline-block rounded-full border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/10 px-3 py-1 text-xs font-medium text-[var(--color-brand-400)]">
        {phase} · Coming soon
      </span>
      <h1 className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] transition-colors"
      >
        Back to Dashboard <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
