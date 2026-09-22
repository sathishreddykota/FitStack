import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";

// ─────────────────────────────────────────────
// Auth Layout
// ─────────────────────────────────────────────
// Centered layout used for sign-in, sign-up, forgot-password

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full bg-[var(--color-surface-0)] text-white">
      {/* Left Pane - Visual (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-black border-r border-white/10">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60" 
          style={{ backgroundImage: "url('/auth-bg.jpg')" }}
        />
        {/* Gradient Overlay for text legibility */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-500)] flex items-center justify-center shadow-[0_0_20px_rgba(255,87,34,0.4)]">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-black" aria-hidden="true">
              <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 8h12M6 16h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-white uppercase">
            {APP_NAME}
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">
            Forge Your <span className="text-[var(--color-brand-500)]">Best Self</span>.
          </h2>
          <p className="text-lg text-[var(--color-text-secondary)] font-medium">
            The all-in-one platform for hybrid athletes. Precision tracking for your nutrition, brutal accountability for your training.
          </p>
        </div>
      </div>

      {/* Right Pane - Auth Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-[var(--color-surface-0)] relative">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-500)] flex items-center justify-center shadow-[0_0_15px_rgba(255,87,34,0.4)]">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-black" aria-hidden="true">
              <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 8h12M6 16h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-white uppercase">
            {APP_NAME}
          </span>
        </div>

        {/* Auth component wrapper */}
        <div className="w-full max-w-md flex flex-col items-center animate-fade-in pt-16 lg:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
