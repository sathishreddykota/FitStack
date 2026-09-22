"use client";

import { useState } from "react";
import { Plus, Droplets, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaterTrackerProps {
  currentAmountMl: number;
  targetMl: number;
  onAdd: (amountMl: number) => Promise<boolean>;
}

export function WaterTracker({ currentAmountMl, targetMl, onAdd }: WaterTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  // Calculate percentage (max 110% for overflow visual)
  const percent = Math.min(Math.round((currentAmountMl / targetMl) * 100), 110);
  
  // Standard vessels
  const vessels = [
    { amount: 250, label: "Glass", emoji: "💧" },
    { amount: 500, label: "Bottle", emoji: "🧊" },
    { amount: 1000, label: "Jug", emoji: "💦" },
  ];

  const handleAdd = async (amount: number) => {
    setIsAdding(true);
    await onAdd(amount);
    setIsAdding(false);
  };

  return (
    <div className="rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm p-8 overflow-hidden relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
        
        {/* The Wave Tank */}
        <div className="relative flex flex-col items-center">
          <div className="relative h-64 w-64 rounded-full border-8 border-[var(--color-surface-2)] bg-[var(--color-surface-1)] shadow-inner overflow-hidden flex items-center justify-center">
            
            {/* Background color of empty tank */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-500/10 z-0" />

            {/* The animated waves */}
            <div 
              className="absolute left-[-50%] right-[-50%] bottom-0 w-[200%] transition-all duration-1000 ease-in-out z-10 flex items-end"
              style={{ height: `${percent}%` }}
            >
              {/* Wave 1 (Back) */}
              <div className="absolute inset-0 bg-blue-400/40 rounded-[40%] animate-wave-slow origin-bottom" style={{ marginBottom: '-50%' }} />
              {/* Wave 2 (Front) */}
              <div className="absolute inset-0 bg-blue-500/80 rounded-[45%] animate-wave-fast origin-bottom" style={{ marginBottom: '-50%' }} />
            </div>

            {/* Text Overlay */}
            <div className="relative z-20 flex flex-col items-center justify-center text-center">
              <Droplets className={cn("h-8 w-8 mb-2 transition-colors duration-500", percent > 50 ? "text-white/90" : "text-blue-400")} />
              <span className={cn("text-5xl font-black tracking-tighter transition-colors duration-500", percent > 50 ? "text-white" : "text-[var(--color-text-primary)]")}>
                {percent}%
              </span>
            </div>
          </div>
        </div>

        {/* Info & Controls */}
        <div className="flex flex-col items-center md:items-start w-full md:w-auto">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-1">Hydration Goal</h3>
          <div className="flex items-baseline gap-2 mb-8">
            <span className="text-5xl lg:text-6xl font-black tracking-tighter text-[var(--color-text-primary)]">
              {(currentAmountMl / 1000).toFixed(1)}
            </span>
            <span className="text-xl text-[var(--color-text-muted)] font-semibold">
              / {(targetMl / 1000).toFixed(1)} L
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
            {vessels.map((v) => (
              <button
                key={v.amount}
                onClick={() => handleAdd(v.amount)}
                disabled={isAdding}
                className="group flex flex-col items-center justify-center py-4 px-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:bg-[var(--color-info-400)]/10 hover:border-[var(--color-info-400)]/30 transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{v.emoji}</span>
                <span className="text-sm font-bold text-[var(--color-text-primary)]">{v.amount}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
