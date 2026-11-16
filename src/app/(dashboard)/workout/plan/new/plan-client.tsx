"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Inputs = { goal: string; style: string; experience: string; daysPerWeek: number; equipment: string };
type Preview = {
  name: string;
  description: string;
  days: { dayName: string; name: string; exercises: { name: string; targetSets: number; targetReps: string }[] }[];
};

const STEPS: { key: keyof Inputs; title: string; options?: { id: string; label: string; desc: string }[] }[] = [
  {
    key: "goal",
    title: "What's your main goal?",
    options: [
      { id: "GAIN_MUSCLE", label: "Build muscle", desc: "Size and shape" },
      { id: "LOSE_FAT", label: "Lose fat", desc: "Keep muscle while cutting" },
      { id: "RECOMPOSITION", label: "Recomp", desc: "Lose fat and gain muscle slowly" },
      { id: "GENERAL_FITNESS", label: "General fitness", desc: "Health, energy, conditioning" },
    ],
  },
  {
    key: "style",
    title: "How do you like to train?",
    options: [
      { id: "HYBRID_STRENGTH", label: "Hybrid", desc: "Heavy lifts + muscle + conditioning" },
      { id: "HYPERTROPHY", label: "Bodybuilding", desc: "Push / pull / legs volume" },
      { id: "STRENGTH", label: "Strength", desc: "Get strong on the big lifts" },
      { id: "RUNNING_STRENGTH", label: "Run + lift", desc: "Running days plus strength" },
      { id: "GENERAL_FITNESS", label: "Mixed", desc: "Full body + cardio" },
    ],
  },
  {
    key: "experience",
    title: "Training experience",
    options: [
      { id: "BEGINNER", label: "Beginner", desc: "Less than 1 year" },
      { id: "INTERMEDIATE", label: "Intermediate", desc: "1–3 years" },
      { id: "ADVANCED", label: "Advanced", desc: "3+ years" },
    ],
  },
  {
    key: "equipment",
    title: "Where do you train?",
    options: [
      { id: "GYM", label: "Gym", desc: "Barbells, machines, cables" },
      { id: "DUMBBELLS", label: "Home with dumbbells", desc: "Dumbbells / kettlebell" },
      { id: "BODYWEIGHT", label: "No equipment", desc: "Bodyweight only" },
    ],
  },
  { key: "daysPerWeek", title: "Days per week" },
];

export function PlanGeneratorClient({ isPro, defaults }: { isPro: boolean; defaults: Inputs }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Inputs>(defaults);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const loadPreview = async () => {
    setBusy(true);
    try {
      setPreview(await api<Preview>("/api/workout/plan/preview", { body: form }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!isPro) return router.push("/settings/subscription");
    setBusy(true);
    try {
      await api("/api/workout/plan", { body: form });
      toast.success("Your plan is ready and scheduled for the next 4 weeks 💪");
      router.push("/workout");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl animate-fade-in pb-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/workout" aria-label="Back" className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-1)]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Build your plan</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {preview ? "Preview" : `Step ${step + 1} of ${STEPS.length}`}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
        {preview ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{preview.name}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{preview.description}</p>
            </div>
            {preview.days.map((d) => (
              <div key={d.dayName} className="rounded-xl border border-[var(--color-border)] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-400)]">{d.dayName}</p>
                <p className="mb-2 font-bold text-[var(--color-text-primary)]">{d.name}</p>
                <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                  {d.exercises.map((e) => (
                    <li key={e.name} className="flex justify-between gap-3">
                      <span>{e.name}</span>
                      <span className="shrink-0 text-[var(--color-text-muted)]">
                        {e.targetSets} × {e.targetReps}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setPreview(null)} className="rounded-xl border border-[var(--color-border)] px-4 py-3 font-bold text-[var(--color-text-primary)]">
                Change
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-500)] py-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : isPro ? <Zap className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                {isPro ? "Start this plan" : "Get PRO to start this plan"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{current.title}</h2>
            {current.options ? (
              <div className="grid gap-3">
                {current.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setForm((f) => ({ ...f, [current.key]: o.id }))}
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-4 text-left transition-colors",
                      form[current.key] === o.id
                        ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 ring-1 ring-[var(--color-brand-500)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]",
                    )}
                  >
                    <span className="font-bold text-[var(--color-text-primary)]">{o.label}</span>
                    <span className="text-sm text-[var(--color-text-muted)]">{o.desc}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6 py-6">
                <button
                  onClick={() => setForm((f) => ({ ...f, daysPerWeek: Math.max(2, f.daysPerWeek - 1) }))}
                  className="h-12 w-12 rounded-full border border-[var(--color-border)] text-2xl font-bold text-[var(--color-text-primary)]"
                >
                  −
                </button>
                <span className="w-16 text-center text-5xl font-black text-[var(--color-brand-500)]">{form.daysPerWeek}</span>
                <button
                  onClick={() => setForm((f) => ({ ...f, daysPerWeek: Math.min(7, f.daysPerWeek + 1) }))}
                  className="h-12 w-12 rounded-full border border-[var(--color-border)] text-2xl font-bold text-[var(--color-text-primary)]"
                >
                  +
                </button>
              </div>
            )}
            <div className="flex gap-3">
              {step > 0 && (
                <button onClick={() => setStep((s) => s - 1)} className="rounded-xl border border-[var(--color-border)] px-4 py-3 font-bold text-[var(--color-text-primary)]">
                  Back
                </button>
              )}
              <button
                onClick={() => (last ? loadPreview() : setStep((s) => s + 1))}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-500)] py-3 font-bold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" />}
                {last ? "Preview my plan" : "Next"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
