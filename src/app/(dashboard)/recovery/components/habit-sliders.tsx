"use client";

import { useState } from "react";
import { Activity, HeartPulse, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitSlidersProps {
  initialMood?: number | null;
  initialEnergy?: number | null;
  initialSoreness?: number | null;
  onSave: (mood: number, energy: number, soreness: number) => Promise<void>;
}

export function HabitSliders({ initialMood, initialEnergy, initialSoreness, onSave }: HabitSlidersProps) {
  const [mood, setMood] = useState<number>(initialMood || 3);
  const [energy, setEnergy] = useState<number>(initialEnergy || 3);
  const [soreness, setSoreness] = useState<number>(initialSoreness || 1);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(mood, energy, soreness);
    setIsSaving(false);
  };

  const renderSlider = (
    label: string, 
    value: number, 
    setValue: (v: number) => void, 
    icon: React.ReactNode, 
    labels: [string, string],
    colorClass: string
  ) => (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          {icon} {label}
        </label>
        <span className={cn("text-sm font-bold", colorClass)}>{value} / 5</span>
      </div>
      
      <input
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-2 bg-[var(--color-surface-2)] rounded-lg appearance-none cursor-pointer accent-[var(--color-brand-400)]"
      />
      <div className="flex justify-between text-xs font-medium text-[var(--color-text-muted)] mt-2 uppercase tracking-wide">
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-500)]/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-[var(--color-accent-400)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Daily Readiness</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Rate your physical state</p>
        </div>
      </div>

      <div className="space-y-6">
        {renderSlider(
          "Mood", 
          mood, 
          setMood, 
          <HeartPulse className="h-4 w-4 text-[var(--color-text-muted)]" />,
          ["Poor", "Great"],
          "text-[var(--color-accent-400)]"
        )}

        {renderSlider(
          "Energy", 
          energy, 
          setEnergy, 
          <Activity className="h-4 w-4 text-[var(--color-text-muted)]" />,
          ["Exhausted", "Energetic"],
          "text-[var(--color-brand-400)]"
        )}

        {renderSlider(
          "Muscle Soreness", 
          soreness, 
          setSoreness, 
          <Dumbbell className="h-4 w-4 text-[var(--color-text-muted)]" />,
          ["None", "Severe"],
          "text-[var(--color-highlight-amber)]"
        )}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] py-3 font-bold text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-surface-3)] active:scale-[0.98] disabled:opacity-50 mt-4"
        >
          {isSaving ? "Saving..." : "Save Readiness"}
        </button>
      </div>
    </div>
  );
}
