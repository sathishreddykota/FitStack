import { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { getRequiredUser } from "@/lib/auth";
import { isProOrElite } from "@/lib/services/subscription-service";

interface PremiumGateProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export async function PremiumGate({ 
  children, 
  title = "Unlock PRO to Access", 
  description = "Take your fitness journey to the next level with our premium features." 
}: PremiumGateProps) {
  const user = await getRequiredUser();
  const hasAccess = await isProOrElite(user.id);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Not PRO - Render the blurred content + Paywall Overlay
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)]">
      {/* Blurred Children */}
      <div className="filter blur-md opacity-50 pointer-events-none select-none max-h-[600px] overflow-hidden">
        {children}
      </div>

      {/* Paywall Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 bg-gradient-to-t from-[var(--color-surface-0)] via-[var(--color-surface-0)]/80 to-transparent">
        <div className="flex flex-col items-center text-center max-w-md bg-[var(--color-surface-1)] border border-[var(--color-border)] p-8 rounded-3xl shadow-elevated">
          <div className="h-16 w-16 bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)] rounded-full flex items-center justify-center mb-6">
            <Lock className="h-8 w-8" />
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] mb-3">
            {title}
          </h2>
          
          <p className="text-[var(--color-text-secondary)] mb-8 font-medium">
            {description}
          </p>
          
          <Link 
            href="/settings/subscription"
            className="flex items-center gap-2 bg-[var(--color-brand-500)] text-black font-black uppercase tracking-widest py-4 px-8 rounded-full shadow-[0_0_20px_rgba(255,87,34,0.4)] hover:bg-white hover:scale-105 transition-all w-full justify-center"
          >
            <Sparkles className="h-5 w-5" />
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
