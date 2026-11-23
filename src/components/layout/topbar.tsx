"use client";

import { useState } from "react";
import { Menu, Bell } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { MobileSidebar } from "./sidebar";
import { APP_NAME } from "@/lib/constants";
import { LogoMark } from "@/components/brand/logo-mark";

// ─────────────────────────────────────────────
// Topbar — shown on mobile, hidden on desktop
// ─────────────────────────────────────────────

export function Topbar({ subInfo }: { subInfo?: { isTrial: boolean; daysLeft: number; hasPaid: boolean; tier?: string } }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-0)]/80 backdrop-blur-md px-4 py-3 lg:hidden">
        {/* Menu button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo (centered on mobile) */}
        <div className="flex-1 flex justify-center">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <LogoMark size={24} />
          <span className="text-sm font-bold text-[var(--color-text-primary)]">{APP_NAME}</span>
          {subInfo?.hasPaid && (
             <span className="bg-[var(--color-brand-500)]/20 text-[var(--color-brand-500)] text-[10px] font-black uppercase tracking-widest py-0.5 px-2 rounded-full border border-[var(--color-brand-500)]/30">
               PRO
             </span>
          )}
          </Link>
        </div>

        {/* Right: notifications + user */}
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <UserButton />
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        subInfo={subInfo}
      />
    </>
  );
}
