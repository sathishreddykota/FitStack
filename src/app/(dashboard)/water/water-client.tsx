"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, Trash2, Calendar, Target } from "lucide-react";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { WaterTrendChart } from "./components/water-trend-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WaterClientProps {
  initialData: {
    targetMl: number;
    totalMl: number;
    logs: any[];
  };
  trendsData: {
    chartData: any[];
    insights: {
      avgMl: number;
      maxStreak: number;
      activeStreak: number;
    };
  };
}

export function WaterClient({ initialData, trendsData }: WaterClientProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleAddWater = async (amountMl: number) => {
    try {
      const res = await fetch("/api/nutrition/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl }),
      });
      if (!res.ok) throw new Error("Failed to log water");
      router.refresh();
      return true;
    } catch (error) {
      toast.error("Failed to log water");
      return false;
    }
  };

  const handleDeleteWater = async (id: string) => {
    try {
      setIsDeleting(id);
      const res = await fetch(`/api/nutrition/water/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete water log");
      router.refresh();
      toast.success("Log removed");
    } catch (error) {
      toast.error("Failed to remove water log");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="theme-water min-h-[calc(100vh-80px)] -m-4 sm:-m-8 p-4 sm:p-8 animate-fade-in pb-12">
      {/* ── Header ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-[var(--color-border)] gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Water
          </h1>
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">Log your hydration and hit your daily goals.</p>
        </div>
      </div>

      {/* ── Main Tracker Widget ──────────────────────── */}
      <section>
        <WaterTracker 
          currentAmountMl={initialData.totalMl} 
          targetMl={initialData.targetMl} 
          onAdd={handleAddWater} 
        />
      </section>

      {/* ── Insights & Trends ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Log Feed */}
        <div className="lg:col-span-1 space-y-4 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            Today's Logs
          </h2>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm min-h-[300px]">
            {initialData.logs.length > 0 ? (
              <div className="space-y-3">
                {initialData.logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[var(--color-info-400)]/10 flex items-center justify-center">
                        <Droplets className="h-5 w-5 text-[var(--color-info-400)]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text-primary)]">+{log.amountMl} ml</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{format(new Date(log.loggedAt), "h:mm a")}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteWater(log.id)}
                      disabled={isDeleting === log.id}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error-400)] hover:bg-[var(--color-error-400)]/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center py-12">
                <div className="h-12 w-12 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center mb-3">
                  <Droplets className="h-6 w-6 text-[var(--color-text-muted)] opacity-50" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">No water logged yet</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Drink up! Use the quick add buttons above.</p>
              </div>
            )}
          </div>
        </div>

        {/* 30-Day Trends */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            30-Day Trends
          </h2>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard 
              label="Daily Average"
              value={`${(trendsData.insights.avgMl / 1000).toFixed(1)} L`}
              icon={Droplets}
              iconColor="var(--color-info-400)"
              subtext="Over last 30 days"
            />
            <StatCard 
              label="Current Streak"
              value={`${trendsData.insights.activeStreak}`}
              icon={Target}
              iconColor="var(--color-brand-400)"
              subtext={`Max: ${trendsData.insights.maxStreak} days`}
            />
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Historical Intake</h3>
            <WaterTrendChart data={trendsData.chartData} />
          </div>
        </div>

      </div>
    </div>
  );
}
