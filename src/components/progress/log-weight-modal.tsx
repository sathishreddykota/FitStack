"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Scale, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeight?: number | null;
}

export function LogWeightModal({ isOpen, onClose, currentWeight }: LogWeightModalProps) {
  const router = useRouter();
  const [weight, setWeight] = useState<string>(currentWeight ? currentWeight.toString() : "");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || isNaN(Number(weight))) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/progress/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: Number(weight),
          date,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to log weight");
      }

      toast.success("Weight logged successfully!");
      router.refresh();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)]">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Log Weight</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Track your bodyweight progress.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              required
              min="20"
              max="300"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-lg font-medium text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)] transition-all"
              placeholder="e.g. 75.5"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none transition-all"
              placeholder="e.g. Morning, after fasting"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl brand-gradient py-3.5 font-bold text-white shadow-[var(--shadow-glow-brand)] transition-transform active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 hover:brightness-110"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Save Weigh-in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
