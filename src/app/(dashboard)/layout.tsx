import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getRequiredUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// ─────────────────────────────────────────────
// Dashboard Layout
// ─────────────────────────────────────────────
// Server component that:
// 1. Verifies authentication (redirects to /sign-in if not)
// 2. Checks onboarding status (redirects to /onboarding if incomplete)
// 3. Renders the sidebar + topbar shell

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getRequiredUser();

  // Redirect to onboarding if not complete
  if (!user.onboardingComplete) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen bg-[var(--color-surface-0)] overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <Topbar />

        {/* Page content with scroll */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
