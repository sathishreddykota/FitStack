"use client";

import { useState } from "react";
import { Menu, Bell } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { MobileSidebar } from "./sidebar";
import { APP_NAME } from "@/lib/constants";

// ─────────────────────────────────────────────
// Topbar — shown on mobile, hidden on desktop
// ─────────────────────────────────────────────

export function Topbar() {
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
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="w-6 h-6 rounded-md brand-gradient flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-3.5 h-3.5 text-white"
              aria-hidden="true"
            >
              <path
                d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 8h12M6 16h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-sm font-bold text-[var(--color-text-primary)]">{APP_NAME}</span>
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
      />
    </>
  );
}
