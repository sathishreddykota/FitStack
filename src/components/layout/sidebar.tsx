"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Dumbbell,
  TrendingUp,
  Droplets,
  Moon,
  Bot,
  User,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

// ─────────────────────────────────────────────
// Icon map (matches icon names in NAV_ITEMS)
// ─────────────────────────────────────────────

const ICON_MAP = {
  LayoutDashboard,
  UtensilsCrossed,
  Dumbbell,
  TrendingUp,
  Droplets,
  Moon,
  Bot,
  User,
  Settings,
} as const;

// ─────────────────────────────────────────────
// Nav Items (matches constants.ts NAV_ITEMS)
// ─────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/nutrition", label: "Nutrition", icon: "UtensilsCrossed" },
  { href: "/workout", label: "Workout", icon: "Dumbbell" },
  { href: "/progress", label: "Progress", icon: "TrendingUp" },
  { href: "/water", label: "Water", icon: "Droplets" },
  { href: "/recovery", label: "Recovery", icon: "Moon" },
  { href: "/coach", label: "AI Coach", icon: "Bot" },
  { href: "/profile", label: "Profile", icon: "User" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;

// Separate main nav from bottom items
const MAIN_NAV = NAV_ITEMS.slice(0, 7);
const BOTTOM_NAV = NAV_ITEMS.slice(7);

// ─────────────────────────────────────────────
// NavItem Component
// ─────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const Icon = ICON_MAP[icon as keyof typeof ICON_MAP];

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-[var(--color-brand-500)]/15 text-[var(--color-brand-400)] border border-[var(--color-brand-500)]/20"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]",
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive
              ? "text-[var(--color-brand-400)]"
              : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]",
          )}
        />
      )}
      <span>{label}</span>
      {isActive && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-brand-400)]" />
      )}
    </Link>
  );
}

// ─────────────────────────────────────────────
// Sidebar (Desktop)
// ─────────────────────────────────────────────

export function Sidebar() {
  const { user } = useUser();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[var(--color-border-subtle)]">
        <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center shadow-[var(--shadow-glow-brand)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 text-white"
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
        <span className="text-base font-bold tracking-tight text-[var(--color-text-primary)]">
          {APP_NAME}
        </span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Main
        </p>
        {MAIN_NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <div className="my-4 border-t border-[var(--color-border-subtle)]" />

        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Account
        </p>
        {BOTTOM_NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* User area */}
      <div className="border-t border-[var(--color-border-subtle)] px-4 py-4">
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 rounded-full",
              },
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {user?.fullName ?? user?.firstName ?? "You"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// Mobile Sidebar (Drawer)
// ─────────────────────────────────────────────

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useUser();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] transition-transform duration-300 ease-[var(--ease-smooth)] lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4 text-white"
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
            <span className="font-bold text-[var(--color-text-primary)]">{APP_NAME}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Main
          </p>
          {MAIN_NAV.map((item) => (
            <NavItem key={item.href} {...item} onClick={onClose} />
          ))}

          <div className="my-4 border-t border-[var(--color-border-subtle)]" />

          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Account
          </p>
          {BOTTOM_NAV.map((item) => (
            <NavItem key={item.href} {...item} onClick={onClose} />
          ))}
        </nav>

        {/* User area */}
        <div className="border-t border-[var(--color-border-subtle)] px-4 py-4">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {user?.fullName ?? user?.firstName ?? "You"}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
