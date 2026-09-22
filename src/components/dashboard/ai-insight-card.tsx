"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AIInsight {
  title: string;
  insight: string;
  actionableAdvice: string;
  isUpgradePrompt?: boolean;
}

export function AIInsightCard() {
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchInsight() {
      try {
        // Simple 24h cache in localStorage to save API costs
        const cachedStr = localStorage.getItem("fitstack_daily_insight");
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          const now = new Date().getTime();
          if (now - cached.timestamp < 24 * 60 * 60 * 1000) {
            setInsight(cached.data);
            setIsLoading(false);
            return;
          }
        }

        const res = await fetch("/api/coach/insight");
        if (res.status === 403) {
          setInsight({
            title: "Unlock Proactive Coaching",
            insight: "Upgrade to PRO to get daily, AI-powered insights based on your recent activity, customized just for you.",
            actionableAdvice: "Join PRO today and supercharge your fitness journey.",
            isUpgradePrompt: true
          });
          setIsLoading(false);
          return;
        }
        
        if (!res.ok) throw new Error("Failed to fetch insight");
        
        const data = await res.json();
        setInsight(data);
        
        localStorage.setItem("fitstack_daily_insight", JSON.stringify({
          data,
          timestamp: new Date().getTime()
        }));
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInsight();
  }, []);

  if (error) return null; // Fallback gracefully if AI is down

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6 lg:p-8 relative overflow-hidden group mb-12">
      {/* Background glow */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-[var(--color-brand-500)] to-transparent rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-1000" />
      
      <div className="flex items-start justify-between gap-6 relative z-10">
        
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[var(--color-brand-400)] font-bold uppercase tracking-widest text-xs mb-3">
            <Sparkles className="h-4 w-4" />
            AI Coach Insight
          </div>
          
          {isLoading ? (
            <div className="space-y-3 mt-4">
              <div className="h-6 w-3/4 bg-[var(--color-surface-2)] animate-pulse rounded" />
              <div className="h-4 w-full bg-[var(--color-surface-2)] animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-[var(--color-surface-2)] animate-pulse rounded" />
            </div>
          ) : insight ? (
            <div className="mt-2">
              <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-[var(--color-text-primary)] mb-3">
                {insight.title}
              </h3>
              <p className="text-[var(--color-text-secondary)] text-lg mb-6 leading-relaxed">
                {insight.insight}
              </p>
              
              {insight.isUpgradePrompt ? (
                <Link 
                  href="/settings/subscription"
                  className="inline-flex items-center gap-2 bg-[var(--color-brand-500)] text-black font-black uppercase tracking-widest py-3 px-6 rounded-full shadow-[0_0_15px_rgba(255,87,34,0.3)] hover:bg-white transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Pro
                </Link>
              ) : (
                <div className="bg-[var(--color-surface-2)]/50 border border-[var(--color-border-subtle)] rounded-2xl p-4 flex items-start gap-4">
                  <div className="bg-[var(--color-brand-500)]/10 p-2 rounded-xl text-[var(--color-brand-400)]">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Today's Action</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">{insight.actionableAdvice}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
