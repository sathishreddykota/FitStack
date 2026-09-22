"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon, Save, Activity, Target } from "lucide-react";
import { toast } from "sonner";
import { ACTIVITY_LEVEL_LABELS, GOAL_LABELS, TRAINING_STYLE_LABELS } from "@/lib/constants";

const ACTIVITY_LEVELS = Object.entries(ACTIVITY_LEVEL_LABELS).map(([value, label]) => ({ value, label }));
const FITNESS_GOALS = Object.entries(GOAL_LABELS).map(([value, label]) => ({ value, label }));
const TRAINING_STYLES = Object.entries(TRAINING_STYLE_LABELS).map(([value, label]) => ({ value, label }));
const DIETARY_PREFERENCES = [
  { value: "NO_PREFERENCE", label: "No preference" },
  { value: "HIGH_PROTEIN", label: "High protein" },
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "PESCATARIAN", label: "Pescatarian" },
  { value: "KETO", label: "Keto" },
];

interface ProfileClientProps {
  initialProfile: any;
  user: any;
}

export function ProfileClient({ initialProfile, user }: ProfileClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    age: initialProfile.age,
    sex: initialProfile.sex,
    heightCm: initialProfile.heightCm,
    currentWeightKg: initialProfile.currentWeightKg,
    targetWeightKg: initialProfile.targetWeightKg,
    activityLevel: initialProfile.activityLevel,
    fitnessGoal: initialProfile.fitnessGoal,
    trainingStyle: initialProfile.trainingStyle || "HYBRID",
    trainingExperience: initialProfile.trainingExperience || "BEGINNER",
    trainingDaysPerWeek: initialProfile.trainingDaysPerWeek || 4,
    dietaryPreference: initialProfile.dietaryPreference || "NONE",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      toast.success("Profile updated! Your macros have been recalculated.");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-4xl mx-auto">
      
      {/* ── Header ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center border-2 border-[var(--color-border)] overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-8 w-8 text-[var(--color-text-muted)]" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{user.name || "My Profile"}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{user.email}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* ── Physical Metrics ──────────────────────── */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-[var(--color-brand-400)]" /> Physical Metrics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Sex</label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Height (cm)</label>
              <input
                type="number"
                name="heightCm"
                value={formData.heightCm}
                onChange={handleChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="currentWeightKg"
                value={formData.currentWeightKg}
                onChange={handleChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Goals & Lifestyle ──────────────────────── */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-[var(--color-accent-400)]" /> Goals & Lifestyle
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Fitness Goal</label>
              <select
                name="fitnessGoal"
                value={formData.fitnessGoal}
                onChange={handleChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none"
              >
                {FITNESS_GOALS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="targetWeightKg"
                value={formData.targetWeightKg}
                onChange={handleChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Activity Level</label>
              <select
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none"
              >
                {ACTIVITY_LEVELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-[var(--color-brand-500)] px-8 py-3 font-bold text-white transition-all hover:bg-[var(--color-brand-600)] active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? "Saving..." : <><Save className="h-4 w-4" /> Save Profile</>}
          </button>
        </div>
      </form>
    </div>
  );
}
