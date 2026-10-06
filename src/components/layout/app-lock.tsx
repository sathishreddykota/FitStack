"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { Lock, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AppLockProps {
  isLocked: boolean;
  children: ReactNode;
}

export function AppLock({ isLocked, children }: AppLockProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLocked && pathname !== "/settings/subscription") {
      router.replace("/settings/subscription");
    }
  }, [isLocked, pathname, router]);

  // Allow access to subscription page always
  if (pathname === "/settings/subscription") {
    return <>{children}</>;
  }

  // If locked, render the lock screen
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4 animate-scale-in">
        <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">Trial Expired</h2>
        <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
          Your 7-day free trial has come to an end. To continue accessing FitStack's premium features and keeping your progress, please activate a subscription.
        </p>
        <Link href="/settings/subscription">
          <Button variant="primary" size="md" className="gap-2">
            <CreditCard className="h-5 w-5" />
            View Subscription Plans
          </Button>
        </Link>
      </div>
    );
  }

  // If not locked, render normal children
  return <>{children}</>;
}
