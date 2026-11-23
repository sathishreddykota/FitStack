import type { ReactNode } from "react";
import { entitlementOf, requireOnboardedUser } from "@/server/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// ─────────────────────────────────────────────
// Dashboard shell: signed in + onboarded users only.
// Nobody is locked out when PRO ends — free features keep working and premium
// pages show an upgrade screen (see PremiumGate).
// ─────────────────────────────────────────────

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireOnboardedUser();
  const plan = entitlementOf(user);
  const subInfo = {
    isTrial: plan.source === "trial",
    hasPaid: plan.source === "paid",
    daysLeft: plan.daysLeft,
    tier: plan.isPro ? "PRO" : "FREE",
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-surface-0)]">
      <Sidebar subInfo={subInfo} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar subInfo={subInfo} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
