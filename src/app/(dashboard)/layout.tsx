import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getRequiredUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AppLock } from "@/components/layout/app-lock";

import { getSubscriptionInfo } from "@/lib/services/subscription-service";

// ─────────────────────────────────────────────
// Dashboard Layout
// ─────────────────────────────────────────────
// Server component that:
// 1. Verifies authentication (redirects to /sign-in if not)
// 2. Checks onboarding status (redirects to /onboarding if incomplete)
// 3. Checks trial status (redirects to /settings/subscription if expired)
// 4. Renders the sidebar + topbar shell

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getRequiredUser();

  // Redirect to onboarding if not complete
  if (!user.onboardingComplete) {
    redirect("/onboarding");
  }

  // Redirect to subscription page if trial is expired and no active plan
  const subInfo = await getSubscriptionInfo(user.id);
  // We'll handle the actual route-based blocking in a client component called AppLock
  
  return (
    <div className="flex h-screen bg-[var(--color-surface-0)] overflow-hidden">
      <Sidebar subInfo={subInfo} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <Topbar subInfo={subInfo} />

        {/* Page content with scroll */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <AppLock isLocked={subInfo.isLocked}>
              {children}
            </AppLock>
          </div>
        </main>
      </div>
    </div>
  );
}
