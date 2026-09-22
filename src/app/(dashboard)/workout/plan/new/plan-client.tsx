"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Target, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function PlanGeneratorClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({
    fitnessGoal: "GAIN_MUSCLE",
    trainingStyle: "HYBRID_STRENGTH",
    trainingExperience: "INTERMEDIATE",
    daysPerWeek: 4,
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/workout/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to generate plan");
      
      toast.success("Training plan successfully generated!");
      router.push("/workout");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl animate-fade-in pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/workout" className="rounded-full p-2 hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">New Training Plan</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Step {step} of 4</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">What is your primary goal?</h2>
            <div className="grid gap-3">
              {[
                { id: "GAIN_MUSCLE", label: "Gain Muscle (Hypertrophy)", desc: "Focus on size and aesthetics." },
                { id: "LOSE_FAT", label: "Lose Fat", desc: "Preserve muscle while cutting." },
                { id: "GENERAL_FITNESS", label: "General Fitness", desc: "Overall health and conditioning." }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateForm("fitnessGoal", opt.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${formData.fitnessGoal === opt.id ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 ring-1 ring-[var(--color-brand-500)]' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}
                >
                  <span className="font-bold text-[var(--color-text-primary)]">{opt.label}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">{opt.desc}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-xl bg-[var(--color-brand-500)] py-3 font-bold text-white shadow-sm hover:brightness-110"
            >
              Next Step
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">What is your preferred style?</h2>
            <div className="grid gap-3">
              {[
                { id: "HYBRID_STRENGTH", label: "Hybrid Strength", desc: "Mix of heavy compounds and hypertrophy." },
                { id: "HYPERTROPHY", label: "Pure Hypertrophy", desc: "Bodybuilding style training." },
                { id: "STRENGTH", label: "Powerlifting", desc: "Focus on maximizing the big 3 lifts." }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateForm("trainingStyle", opt.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${formData.trainingStyle === opt.id ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 ring-1 ring-[var(--color-brand-500)]' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}
                >
                  <span className="font-bold text-[var(--color-text-primary)]">{opt.label}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">{opt.desc}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="rounded-xl border border-[var(--color-border)] px-4 py-3 font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-background)]">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 rounded-xl bg-[var(--color-brand-500)] py-3 font-bold text-white shadow-sm hover:brightness-110">Next Step</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Training Experience</h2>
            <div className="grid gap-3">
              {[
                { id: "BEGINNER", label: "Beginner", desc: "< 1 year lifting" },
                { id: "INTERMEDIATE", label: "Intermediate", desc: "1 - 3 years lifting" },
                { id: "ADVANCED", label: "Advanced", desc: "3+ years lifting" }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateForm("trainingExperience", opt.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${formData.trainingExperience === opt.id ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 ring-1 ring-[var(--color-brand-500)]' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}
                >
                  <span className="font-bold text-[var(--color-text-primary)]">{opt.label}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">{opt.desc}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="rounded-xl border border-[var(--color-border)] px-4 py-3 font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-background)]">Back</button>
              <button onClick={() => setStep(4)} className="flex-1 rounded-xl bg-[var(--color-brand-500)] py-3 font-bold text-white shadow-sm hover:brightness-110">Next Step</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">How many days per week?</h2>
            <div className="flex items-center gap-4 justify-center py-8">
              <button onClick={() => updateForm("daysPerWeek", Math.max(2, formData.daysPerWeek - 1))} className="h-12 w-12 rounded-full border border-[var(--color-border)] text-2xl font-bold hover:bg-[var(--color-background)]">-</button>
              <span className="text-5xl font-black text-[var(--color-brand-500)] w-16 text-center">{formData.daysPerWeek}</span>
              <button onClick={() => updateForm("daysPerWeek", Math.min(7, formData.daysPerWeek + 1))} className="h-12 w-12 rounded-full border border-[var(--color-border)] text-2xl font-bold hover:bg-[var(--color-background)]">+</button>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(3)} className="rounded-xl border border-[var(--color-border)] px-4 py-3 font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-background)]">Back</button>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-highlight-500)] py-3 font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current" />}
                Generate My Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
