import type { Metadata } from "next";
import { UserProfile } from "@clerk/nextjs";
import { Settings as SettingsIcon, Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your account, security, and preferences.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <SettingsIcon className="h-7 w-7 text-[var(--color-brand-400)]" /> Account Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manage your security and authentication preferences.</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">FitStack Subscription</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Manage your plan, billing cycle, and premium features.</p>
        </div>
        <Link 
          href="/settings/subscription"
          className="flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-text-primary)] font-bold px-6 py-2.5 rounded-xl hover:bg-[var(--color-brand-500)] hover:text-black transition-colors shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          Manage Subscription
        </Link>
      </div>
      
      <div className="flex justify-center w-full">
        {/* We use Clerk's pre-built gorgeous settings modal right in the page! */}
        <UserProfile 
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full shadow-none",
              card: "w-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm rounded-2xl",
              navbar: "hidden md:flex",
              headerTitle: "text-[var(--color-text-primary)]",
              headerSubtitle: "text-[var(--color-text-muted)]",
              profileSectionTitle: "text-[var(--color-text-primary)] border-b border-[var(--color-border)]",
              profileSectionTitleText: "text-[var(--color-text-primary)]",
              profileSectionContent: "text-[var(--color-text-muted)]",
              formButtonPrimary: "bg-[var(--color-brand-500)] hover:bg-[var(--color-brand-600)] text-white shadow-none",
              formFieldLabel: "text-[var(--color-text-primary)]",
              formFieldInput: "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-primary)]",
              footerActionLink: "text-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]",
            }
          }}
        />
      </div>
    </div>
  );
}
