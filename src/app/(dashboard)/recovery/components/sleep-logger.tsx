"use client";

import { useState } from "react";
import { Moon, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SleepLoggerProps {
  initialDuration?: number | null;
  initialQuality?: string | null;
  onSave: (durationMinutes: number, quality: string) => Promise<void>;
}

const QUALITY_OPTIONS = [
  { value: "POOR", label: "Poor" },
  { value: "FAIR", label: "Fair" },
  { value: "GOOD", label: "Good" },
  { value: "EXCELLENT", label: "Excellent" },
];

export function SleepLogger({ initialDuration, initialQuality, onSave }: SleepLoggerProps) {
  const [hours, setHours] = useState<number>(initialDuration ? Math.floor(initialDuration / 60) : 8);
  const [minutes, setMinutes] = useState<number>(initialDuration ? initialDuration % 60 : 0);
  const [quality, setQuality] = useState<string>(initialQuality || "GOOD");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(hours * 60 + minutes, quality);
    setIsSaving(false);
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[var(--color-brand-500)]/10 flex items-center justify-center">
          <Moon className="h-5 w-5 text-[var(--color-brand-400)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Sleep Log</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Track duration and quality</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Duration Input */}
        <div>
          <label className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-[var(--color-text-muted)]" /> Duration
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Hours</label>
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-lg font-bold text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-400)]"
              />
            </div>
            <span className="text-2xl text-[var(--color-text-muted)] mt-4">:</span>
            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)] block mb-1">Minutes</label>
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-lg font-bold text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-400)]"
              >
                <option value={0}>00</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quality Input */}
        <div>
          <label className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-[var(--color-text-muted)]" /> Quality
          </label>
          <div className="grid grid-cols-4 gap-2">
            {QUALITY_OPTIONS.map((opt, i) => {
              const isSelected = quality === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
                    isSelected 
                      ? "border-[var(--color-brand-400)] bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)]" 
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
                  )}
                >
                  <span className="text-lg font-bold">{i + 1}</span>
                  <span className="text-[10px] uppercase font-bold mt-1 tracking-tighter truncate w-full text-center">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-xl bg-[var(--color-brand-500)] py-3 font-bold text-white transition-all hover:bg-[var(--color-brand-600)] active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Sleep Log"}
        </button>
      </div>
    </div>
  );
}
