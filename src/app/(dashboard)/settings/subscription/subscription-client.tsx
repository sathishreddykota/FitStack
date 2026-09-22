"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionClientProps {
  currentTier: string;
}

export function SubscriptionClient({ currentTier }: SubscriptionClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleUpgrade = async (planId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Create Subscription on our backend
      const response = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate upgrade");
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key
        subscription_id: data.subscriptionId,
        name: "FitStack PRO",
        description: "Unlock all premium tracking and AI Coach features.",
        image: "https://your-logo-url.png", // Optional: Add app logo
        handler: async function (response: any) {
          try {
            setIsLoading(true);
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const errData = await verifyRes.json();
              throw new Error(errData.error || "Verification failed");
            }

            alert("Payment Successful! Your account has been upgraded.");
            window.location.reload();
          } catch (err: any) {
            setError("Payment succeeded, but verification failed: " + err.message);
            setIsLoading(false);
          }
        },
        prefill: {
          name: "",
          email: "",
        },
        theme: {
          color: "#FF5722",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      
      rzp.on("payment.failed", function (response: any) {
        setError(response.error.description);
      });

      rzp.open();

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your PRO subscription? You will lose access to premium features at the end of your billing cycle.")) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/razorpay/cancel-subscription", {
        method: "POST",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel subscription");
      }
      
      alert("Subscription cancelled successfully.");
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const isPro = currentTier === "PRO" || currentTier === "ELITE";

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-[var(--color-text-primary)]">
          Subscription Plan
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)]">
          Manage your subscription and billing details.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-red-500">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* FREE PLAN */}
        <div className={cn(
          "rounded-3xl p-8 border",
          !isPro ? "bg-[var(--color-surface-1)] border-[var(--color-border)] shadow-sm" : "bg-[var(--color-surface-0)] border-[var(--color-border-subtle)] opacity-60"
        )}>
          <div className="mb-8">
            <h3 className="text-2xl font-black text-[var(--color-text-primary)] mb-2">Basic Tracker</h3>
            <div className="flex items-end gap-2 text-[var(--color-text-primary)]">
              <span className="text-5xl font-black">Free</span>
            </div>
            <p className="text-[var(--color-text-secondary)] mt-4">Essential nutrition logging.</p>
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span>Search & Log Foods</span>
            </li>
            <li className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span>Barcode Scanner</span>
            </li>
            <li className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span>Macro Tracking</span>
            </li>
          </ul>

          <div className="mt-auto">
            {!isPro ? (
              <div className="w-full text-center py-3 bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] font-bold rounded-xl border border-[var(--color-border)] uppercase tracking-wider text-sm">
                Current Plan
              </div>
            ) : null}
          </div>
        </div>

        {/* PRO PLAN */}
        <div className={cn(
          "rounded-3xl p-8 border relative overflow-hidden",
          isPro 
            ? "bg-[var(--color-surface-1)] border-[var(--color-brand-500)] shadow-[0_0_30px_rgba(255,87,34,0.15)]" 
            : "bg-gradient-to-b from-[var(--color-surface-1)] to-[var(--color-surface-0)] border-[var(--color-border)]"
        )}>
          {/* Glow effect */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-[var(--color-brand-500)] to-transparent rounded-full opacity-10 blur-3xl pointer-events-none" />

          <div className="mb-8 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-black text-[var(--color-brand-400)]">FitStack PRO</h3>
              {isPro && (
                <span className="bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)] text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-end gap-2 text-[var(--color-text-primary)]">
              <span className="text-5xl font-black">₹199</span>
              <span className="text-[var(--color-text-secondary)] font-medium pb-1">/ month</span>
            </div>
            <p className="text-[var(--color-text-secondary)] mt-4">Unlock everything you need to crush your goals.</p>
          </div>

          <ul className="space-y-4 mb-8 relative z-10">
            <li className="flex items-center gap-3 text-[var(--color-text-primary)]">
              <Sparkles className="h-5 w-5 text-[var(--color-brand-500)] flex-shrink-0" />
              <span className="font-semibold">AI Coach Insights & Chat</span>
            </li>
            <li className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <Check className="h-5 w-5 text-[var(--color-brand-500)] flex-shrink-0" />
              <span>Full Workout Logger & Plans</span>
            </li>
            <li className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <Check className="h-5 w-5 text-[var(--color-brand-500)] flex-shrink-0" />
              <span>Advanced Progress Analytics</span>
            </li>
            <li className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <Check className="h-5 w-5 text-[var(--color-brand-500)] flex-shrink-0" />
              <span>Recovery & Sleep Tracking</span>
            </li>
            <li className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <Check className="h-5 w-5 text-[var(--color-brand-500)] flex-shrink-0" />
              <span>Interactive Water Tracker</span>
            </li>
          </ul>

          <div className="mt-auto relative z-10">
            {isPro ? (
              <button 
                onClick={handleCancel}
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 text-red-400 hover:bg-red-500/10 font-bold rounded-xl transition-colors uppercase tracking-wider text-sm disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Cancel Subscription"}
              </button>
            ) : (
              <button 
                onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_RAZORPAY_PRO_MONTHLY_PLAN_ID || "plan_xxx")} // Replace with actual env var later if needed, but we used process.env in server, wait, in client we need NEXT_PUBLIC_
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-4 bg-[var(--color-brand-500)] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(255,87,34,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
