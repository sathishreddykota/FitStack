import type { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { entitlementOf, requireUser } from "@/server/auth";

interface PremiumGateProps {
  children: ReactNode;
  title?: string;
  description?: string;
  /** Short feature list shown on the paywall. */
  perks?: string[];
}

/**
 * Server-side PRO gate.
 *
 * When the user isn't PRO the children are NOT rendered at all, so no premium
 * data is fetched or sent to the browser (the old gate rendered the real page
 * under a blur). Put data fetching inside an async child component.
 */
export async function PremiumGate({
  children,
  title = "Unlock with FitStack PRO",
  description = "Everything you need to hit your goals, for ₹199 a month.",
  perks = ["AI coach that knows your data", "AI food & workout logging", "Smart training plans", "Progress & recovery analytics"],
}: PremiumGateProps) {
  const user = await requireUser();
  if (entitlementOf(user).isPro) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-8 text-center shadow-[var(--shadow-elevated)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)]">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="mb-3 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">{title}</h2>
        <p className="mb-6 font-medium text-[var(--color-text-secondary)]">{description}</p>
        <ul className="mb-8 space-y-2 text-left text-sm text-[var(--color-text-secondary)]">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-brand-400)]" />
              {p}
            </li>
          ))}
        </ul>
        <Link
          href="/settings/subscription"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-500)] px-8 py-4 font-black uppercase tracking-widest text-black transition-transform hover:scale-105"
        >
          <Sparkles className="h-5 w-5" />
          Get PRO · ₹199/mo
        </Link>
      </div>
    </div>
  );
}
