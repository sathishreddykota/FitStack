"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, HeartPulse, Target, TrendingUp } from "lucide-react";
import { SleepLogger } from "./components/sleep-logger";
import { HabitSliders } from "./components/habit-sliders";
import { RecoveryTrendsChart } from "./components/recovery-trends-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { toast } from "sonner";

interface RecoveryClientProps {
  todayStr: string;
  initialData: {
    sleep: any | null;
    habits: any | null;
  };
  trendsData: {
    chartData: any[];
    insights: {
      avgSleepHours: number;
      avgEnergy: number;
      daysLogged: number;
    };
  };
}

export function RecoveryClient({ todayStr, initialData, trendsData }: RecoveryClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  const handleSaveSleep = async (durationMinutes: number, quality: string) => {
    try {
      const res = await fetch("/api/recovery/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateStr: todayStr, durationMinutes, quality }),
      });
      if (!res.ok) throw new Error("Failed to save sleep");
      toast.success("Sleep logged successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to log sleep");
    }
  };

  const handleSaveHabits = async (mood: number, energy: number, soreness: number) => {
    try {
      const res = await fetch("/api/recovery/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateStr: todayStr, mood, energyLevel: energy, sorenessLevel: soreness }),
      });
      if (!res.ok) throw new Error("Failed to save habits");
      toast.success("Readiness logged successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to log habits");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ── Header ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Sleep & Recovery</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Track your rest and readiness to optimize performance.</p>
        </div>
      </div>

      {/* ── Logging Section ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SleepLogger 
          initialDuration={data.sleep?.durationMinutes}
          initialQuality={data.sleep?.quality}
          onSave={handleSaveSleep}
        />
        <HabitSliders 
          initialMood={data.habits?.mood}
          initialEnergy={data.habits?.energyLevel}
          initialSoreness={data.habits?.sorenessLevel}
          onSave={handleSaveHabits}
        />
      </div>

      {/* ── Insights & Trends ──────────────────────── */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[var(--color-text-muted)]" /> 30-Day Recovery Trends
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            label="Avg Sleep"
            value={`${trendsData.insights.avgSleepHours.toFixed(1)} hrs`}
            icon={Moon}
            iconColor="var(--color-brand-400)"
            subtext="Over last 30 days"
          />
          <StatCard 
            label="Avg Energy"
            value={`${trendsData.insights.avgEnergy.toFixed(1)} / 5`}
            icon={HeartPulse}
            iconColor="var(--color-accent-400)"
            subtext="Over last 30 days"
          />
          <StatCard 
            label="Days Logged"
            value={`${trendsData.insights.daysLogged}`}
            icon={Target}
            iconColor="var(--color-info-400)"
            subtext="Out of 30 days"
          />
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Sleep vs Energy Correlation</h3>
          <RecoveryTrendsChart data={trendsData.chartData} />
        </div>
      </div>
    </div>
  );
}
