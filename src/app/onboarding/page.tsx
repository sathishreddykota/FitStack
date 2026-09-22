"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  User,
  Target,
  Dumbbell,
  Utensils,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Loader2,
} from "lucide-react";
import { onboardingSchema, type OnboardingFormData } from "@/utils/validators";
import { runCalorieEngine } from "@/utils/calculations";
import { Button } from "@/components/ui/button";
import {
  GOAL_LABELS,
  TRAINING_STYLE_LABELS,
  ACTIVITY_LEVEL_LABELS,
  APP_NAME,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Step Definitions
// ─────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "You", icon: User },
  { id: 2, label: "Goals", icon: Target },
  { id: 3, label: "Training", icon: Dumbbell },
  { id: 4, label: "Lifestyle", icon: Utensils },
  { id: 5, label: "Summary", icon: CheckCircle2 },
] as const;

// ─────────────────────────────────────────────
// Option Button Helper
// ─────────────────────────────────────────────

function OptionButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer",
        selected
          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 shadow-[var(--shadow-glow-brand)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-3)]",
        className,
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-500)]">
          <CheckCircle2 className="h-3 w-3 text-white" />
        </span>
      )}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// Field Error Helper
// ─────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-[var(--color-error-400)]">{message}</p>;
}

// ─────────────────────────────────────────────
// Number Input
// ─────────────────────────────────────────────

function NumberInput({
  label,
  unit,
  error,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
}: {
  label: string;
  unit: string;
  error?: string;
  value: number | string;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn(
            "w-full rounded-xl border bg-[var(--color-surface-2)] px-4 py-3 pr-14 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent",
            error
              ? "border-[var(--color-error-400)]"
              : "border-[var(--color-border)] hover:border-[var(--color-surface-5)]",
          )}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">
          {unit}
        </span>
      </div>
      <FieldError message={error} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Onboarding Page
// ─────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      age: undefined,
      sex: undefined,
      heightCm: undefined,
      currentWeightKg: undefined,
      targetWeightKg: undefined,
      fitnessGoal: undefined,
      activityLevel: undefined,
      trainingExperience: undefined,
      trainingDaysPerWeek: 4,
      trainingStyle: undefined,
      cardioPreference: undefined,
      dietaryPreference: undefined,
    },
    mode: "onChange",
  });

  const formData = watch();

  // Calculate live estimates for summary step
  const canCalculate =
    formData.currentWeightKg &&
    formData.heightCm &&
    formData.age &&
    formData.sex &&
    formData.activityLevel &&
    formData.fitnessGoal;

  const estimates = canCalculate
    ? runCalorieEngine({
        weightKg: formData.currentWeightKg!,
        heightCm: formData.heightCm!,
        age: formData.age!,
        sex: formData.sex!,
        activityLevel: formData.activityLevel!,
        goal: formData.fitnessGoal!,
      })
    : null;

  // ── Step Validation ──────────────────────────

  const stepFields: Record<number, (keyof OnboardingFormData)[]> = {
    1: ["name", "age", "sex", "heightCm", "currentWeightKg", "targetWeightKg"],
    2: ["fitnessGoal", "activityLevel"],
    3: ["trainingExperience", "trainingDaysPerWeek", "trainingStyle", "cardioPreference"],
    4: ["dietaryPreference"],
    5: [],
  };

  async function goNext() {
    const fields = stepFields[step];
    const valid = await trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  // ── Submit ────────────────────────────────────

  async function onSubmit(data: OnboardingFormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      toast.success("Welcome to FitStack! 🎉");
      router.push("/dashboard");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-[var(--color-surface-0)] overflow-hidden">
      {/* ── LEFT PANE: Form Action Area ── */}
      <div className="flex-1 flex flex-col relative z-10 lg:w-1/2 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <header className="flex-none flex items-center justify-between px-6 py-5 sticky top-0 bg-[var(--color-surface-0)]/80 backdrop-blur-md z-20 border-b border-[var(--color-border-subtle)] lg:border-none">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center shadow-[var(--shadow-glow-brand)]">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" aria-hidden="true">
                <path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4M6 8h12M6 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-[var(--color-text-primary)] tracking-tight">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Step {step} of {STEPS.length}
            </span>
          </div>
        </header>

        {/* Minimal Progress Bar */}
        <div className="flex-none h-1 w-full bg-[var(--color-surface-2)]">
          <div
            className="h-full brand-gradient transition-all duration-500 ease-[var(--ease-smooth)]"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Form Container */}
        <div className="flex-1 px-6 py-8 pb-48">
          <div className="mx-auto w-full max-w-xl">
            <form onSubmit={handleSubmit(onSubmit)} className="animate-slide-up">
              {/* Step indicator (Mobile only / inside form) */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] mb-6">
                 {(() => {
                   const s = STEPS[step - 1];
                   const Icon = s.icon;
                   return (
                     <>
                       <Icon className="h-4 w-4 text-[var(--color-brand-400)]" />
                       <span className="text-xs font-semibold text-[var(--color-text-primary)]">{s.label}</span>
                     </>
                   )
                 })()}
              </div>
            {/* ── Step 1: You ──────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                    Let&apos;s get to know you
                  </h1>
                  <p className="text-[var(--color-text-secondary)]">
                    This helps us calculate accurate targets. All values are private to your
                    account.
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Your name
                  </label>
                  <input
                    {...register("name")}
                    type="text"
                    placeholder="e.g. Alex"
                    className={cn(
                      "w-full rounded-xl border bg-[var(--color-surface-2)] px-4 py-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent",
                      errors.name
                        ? "border-[var(--color-error-400)]"
                        : "border-[var(--color-border)]",
                    )}
                  />
                  <FieldError message={errors.name?.message} />
                </div>

                {/* Age */}
                <NumberInput
                  label="Age"
                  unit="years"
                  value={formData.age ?? ""}
                  onChange={(v) => setValue("age", v, { shouldValidate: true })}
                  min={13}
                  max={100}
                  placeholder="25"
                  error={errors.age?.message}
                />

                {/* Sex */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Biological sex{" "}
                    <span className="text-[var(--color-text-muted)] font-normal">
                      (used for BMR calculation)
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["MALE", "FEMALE", "OTHER"] as const).map((s) => (
                      <OptionButton
                        key={s}
                        selected={formData.sex === s}
                        onClick={() => setValue("sex", s, { shouldValidate: true })}
                      >
                        <span className="font-medium text-[var(--color-text-primary)] text-sm capitalize">
                          {s.toLowerCase()}
                        </span>
                      </OptionButton>
                    ))}
                  </div>
                  <FieldError message={errors.sex?.message} />
                </div>

                {/* Height & Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput
                    label="Height"
                    unit="cm"
                    value={formData.heightCm ?? ""}
                    onChange={(v) => setValue("heightCm", v, { shouldValidate: true })}
                    min={100}
                    max={250}
                    placeholder="175"
                    error={errors.heightCm?.message}
                  />
                  <NumberInput
                    label="Current weight"
                    unit="kg"
                    value={formData.currentWeightKg ?? ""}
                    onChange={(v) => setValue("currentWeightKg", v, { shouldValidate: true })}
                    min={30}
                    max={300}
                    step={0.1}
                    placeholder="75.0"
                    error={errors.currentWeightKg?.message}
                  />
                </div>

                {/* Target weight */}
                <NumberInput
                  label="Target weight"
                  unit="kg"
                  value={formData.targetWeightKg ?? ""}
                  onChange={(v) => setValue("targetWeightKg", v, { shouldValidate: true })}
                  min={30}
                  max={300}
                  step={0.1}
                  placeholder="70.0"
                  error={errors.targetWeightKg?.message}
                />
              </div>
            )}

            {/* ── Step 2: Goals ─────────────────────────── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                    What are your goals?
                  </h1>
                  <p className="text-[var(--color-text-secondary)]">
                    Choose your primary focus. We&apos;ll set your calorie and macro targets
                    accordingly.
                  </p>
                </div>

                {/* Fitness Goal */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                    Primary goal
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.entries(GOAL_LABELS) as [keyof typeof GOAL_LABELS, string][]).map(
                      ([value, label]) => (
                        <OptionButton
                          key={value}
                          selected={formData.fitnessGoal === value}
                          onClick={() => setValue("fitnessGoal", value, { shouldValidate: true })}
                        >
                          <span className="font-semibold text-[var(--color-text-primary)] text-sm">
                            {label}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {value === "GAIN_MUSCLE" && "+300 kcal surplus"}
                            {value === "LOSE_FAT" && "−400 kcal deficit"}
                            {value === "MAINTAIN" && "Maintenance calories"}
                            {value === "RECOMPOSITION" && "Slight deficit, high protein"}
                            {value === "GENERAL_FITNESS" && "Balanced approach"}
                          </span>
                        </OptionButton>
                      ),
                    )}
                  </div>
                  <FieldError message={errors.fitnessGoal?.message} />
                </div>

                {/* Activity Level */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                    Activity level
                  </label>
                  <div className="space-y-2">
                    {(
                      Object.entries(ACTIVITY_LEVEL_LABELS) as [
                        keyof typeof ACTIVITY_LEVEL_LABELS,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <OptionButton
                        key={value}
                        selected={formData.activityLevel === value}
                        onClick={() =>
                          setValue("activityLevel", value, { shouldValidate: true })
                        }
                        className="w-full"
                      >
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {label}
                        </span>
                      </OptionButton>
                    ))}
                  </div>
                  <FieldError message={errors.activityLevel?.message} />
                </div>
              </div>
            )}

            {/* ── Step 3: Training ──────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                    Your training
                  </h1>
                  <p className="text-[var(--color-text-secondary)]">
                    Helps us recommend the right plans and track your progress accurately.
                  </p>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                    Experience level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((level) => (
                      <OptionButton
                        key={level}
                        selected={formData.trainingExperience === level}
                        onClick={() =>
                          setValue("trainingExperience", level, { shouldValidate: true })
                        }
                      >
                        <span className="font-semibold text-[var(--color-text-primary)] text-sm">
                          {level.charAt(0) + level.slice(1).toLowerCase()}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {level === "BEGINNER" && "< 1 year"}
                          {level === "INTERMEDIATE" && "1–3 years"}
                          {level === "ADVANCED" && "3+ years"}
                        </span>
                      </OptionButton>
                    ))}
                  </div>
                  <FieldError message={errors.trainingExperience?.message} />
                </div>

                {/* Training days */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                    Training days per week
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setValue("trainingDaysPerWeek", d, { shouldValidate: true })
                        }
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl border text-sm font-bold transition-all",
                          formData.trainingDaysPerWeek === d
                            ? "brand-gradient border-transparent text-white shadow-[var(--shadow-glow-brand)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)]",
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <FieldError message={errors.trainingDaysPerWeek?.message} />
                </div>

                {/* Training style */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                    Training style
                  </label>
                  <div className="space-y-2">
                    {(
                      Object.entries(TRAINING_STYLE_LABELS) as [
                        keyof typeof TRAINING_STYLE_LABELS,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <OptionButton
                        key={value}
                        selected={formData.trainingStyle === value}
                        onClick={() =>
                          setValue("trainingStyle", value, { shouldValidate: true })
                        }
                        className="w-full"
                      >
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {label}
                        </span>
                      </OptionButton>
                    ))}
                  </div>
                  <FieldError message={errors.trainingStyle?.message} />
                </div>

                {/* Cardio preference */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                    Cardio preference
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(
                      [
                        { value: "NONE", label: "None", desc: "Strength only" },
                        { value: "LIGHT", label: "Light", desc: "1–2×/week" },
                        { value: "MODERATE", label: "Moderate", desc: "3–4×/week" },
                        { value: "HEAVY", label: "Heavy", desc: "5+/week" },
                      ] as const
                    ).map(({ value, label, desc }) => (
                      <OptionButton
                        key={value}
                        selected={formData.cardioPreference === value}
                        onClick={() =>
                          setValue("cardioPreference", value, { shouldValidate: true })
                        }
                      >
                        <span className="font-semibold text-[var(--color-text-primary)] text-sm">
                          {label}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">{desc}</span>
                      </OptionButton>
                    ))}
                  </div>
                  <FieldError message={errors.cardioPreference?.message} />
                </div>
              </div>
            )}

            {/* ── Step 4: Lifestyle ─────────────────────── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                    Dietary preferences
                  </h1>
                  <p className="text-[var(--color-text-secondary)]">
                    Helps us personalise food suggestions. You can change this anytime in settings.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { value: "NO_PREFERENCE", label: "No preference", emoji: "🍽️" },
                      { value: "HIGH_PROTEIN", label: "High protein", emoji: "🥩" },
                      { value: "VEGETARIAN", label: "Vegetarian", emoji: "🥗" },
                      { value: "VEGAN", label: "Vegan", emoji: "🌱" },
                      { value: "PESCATARIAN", label: "Pescatarian", emoji: "🐟" },
                      { value: "KETO", label: "Keto", emoji: "🥑" },
                    ] as const
                  ).map(({ value, label, emoji }) => (
                    <OptionButton
                      key={value}
                      selected={formData.dietaryPreference === value}
                      onClick={() =>
                        setValue("dietaryPreference", value, { shouldValidate: true })
                      }
                    >
                      <span className="text-2xl mb-1">{emoji}</span>
                      <span className="font-semibold text-[var(--color-text-primary)] text-sm">
                        {label}
                      </span>
                    </OptionButton>
                  ))}
                </div>
                <FieldError message={errors.dietaryPreference?.message} />
              </div>
            )}

            {/* ── Step 5: Summary ───────────────────────── */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                    Your personalised targets
                  </h1>
                  <p className="text-[var(--color-text-secondary)]">
                    Calculated using the Mifflin-St Jeor equation. These are science-backed
                    starting estimates — monitor your progress over 2–4 weeks and adjust if needed.
                  </p>
                </div>

                {estimates ? (
                  <>
                    {/* Calorie + Macro Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          icon: Flame,
                          label: "Daily Calories",
                          value: `${estimates.dailyCalorieTarget}`,
                          unit: "kcal",
                          color: "var(--color-calories)",
                        },
                        {
                          icon: Beef,
                          label: "Protein",
                          value: `${estimates.macros.proteinG}`,
                          unit: "g / day",
                          color: "var(--color-protein)",
                        },
                        {
                          icon: Wheat,
                          label: "Carbs",
                          value: `${estimates.macros.carbsG}`,
                          unit: "g / day",
                          color: "var(--color-carbs)",
                        },
                        {
                          icon: Droplets,
                          label: "Water",
                          value: `${(estimates.waterTargetMl / 1000).toFixed(1)}`,
                          unit: "L / day",
                          color: "var(--color-info-400)",
                        },
                      ].map(({ icon: Icon, label, value, unit, color }) => (
                        <div
                          key={label}
                          className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4"
                        >
                          <Icon className="h-5 w-5" style={{ color }} />
                          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                            {value}
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)]">{unit}</div>
                          <div className="text-xs font-medium text-[var(--color-text-secondary)]">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Macro breakdown */}
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
                      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">
                        Macro breakdown
                      </h3>
                      <div className="flex gap-2 mb-3">
                        {[
                          {
                            label: "Protein",
                            g: estimates.macros.proteinG,
                            cal: estimates.macros.proteinG * 4,
                            color: "var(--color-protein)",
                          },
                          {
                            label: "Carbs",
                            g: estimates.macros.carbsG,
                            cal: estimates.macros.carbsG * 4,
                            color: "var(--color-carbs)",
                          },
                          {
                            label: "Fat",
                            g: estimates.macros.fatG,
                            cal: estimates.macros.fatG * 9,
                            color: "var(--color-fat)",
                          },
                        ].map(({ label, g, cal, color }) => (
                          <div
                            key={label}
                            className="flex-1 text-center rounded-lg p-3"
                            style={{ background: `${color}15` }}
                          >
                            <div
                              className="text-lg font-bold"
                              style={{ color }}
                            >
                              {g}g
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)]">{cal} kcal</div>
                            <div
                              className="text-xs font-medium mt-0.5"
                              style={{ color }}
                            >
                              {label}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        BMR: {estimates.bmr} kcal · TDEE: {estimates.tdee} kcal · Adjustment:{" "}
                        {estimates.dailyCalorieTarget - estimates.tdee > 0 ? "+" : ""}
                        {estimates.dailyCalorieTarget - estimates.tdee} kcal
                      </p>
                    </div>

                    {/* Profile summary */}
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
                      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">
                        Your profile
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { label: "Name", value: formData.name },
                          {
                            label: "Goal",
                            value: formData.fitnessGoal
                              ? GOAL_LABELS[formData.fitnessGoal]
                              : "—",
                          },
                          {
                            label: "Weight",
                            value: formData.currentWeightKg
                              ? `${formData.currentWeightKg} kg`
                              : "—",
                          },
                          {
                            label: "Target",
                            value: formData.targetWeightKg
                              ? `${formData.targetWeightKg} kg`
                              : "—",
                          },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <span className="text-[var(--color-text-muted)]">{label}: </span>
                            <span className="text-[var(--color-text-primary)] font-medium">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-[var(--color-text-muted)] text-center">
                      These estimates are a starting point, not medical advice. Adjust based on
                      your progress in settings.
                    </p>
                  </>
                ) : (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-8 text-center">
                    <p className="text-[var(--color-text-muted)]">
                      Complete the earlier steps to see your personalised targets.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation (Sticky Footer) ───────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 lg:right-1/2 p-4 lg:p-6 bg-gradient-to-t from-[var(--color-surface-0)] via-[var(--color-surface-0)] to-transparent z-30 flex items-center justify-center pointer-events-none">
              <div className="w-full max-w-xl flex items-center justify-between gap-4 pointer-events-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  disabled={step === 1}
                  className={cn(
                    "gap-2 bg-[var(--color-surface-1)] shadow-card transition-all duration-300",
                    step === 1 ? "opacity-0 pointer-events-none w-0 p-0 overflow-hidden" : "opacity-100"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>

                {step < STEPS.length ? (
                  <Button type="button" onClick={goNext} className="gap-2 flex-1 shadow-elevated">
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2 flex-1 shadow-[var(--shadow-glow-brand)]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Start FitStack
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
      
    {/* ── RIGHT PANE: Dynamic Context (Desktop Only) ── */}
      <div className="hidden lg:flex flex-1 relative bg-[var(--color-surface-1)] border-l border-[var(--color-border-subtle)] flex-col items-center justify-center p-12 overflow-hidden">
        {/* Abstract Background Effects */}
        <div className="absolute inset-0 hero-gradient opacity-30" />
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[var(--color-accent-500)]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[var(--color-brand-500)]/10 blur-[100px] rounded-full pointer-events-none" />
        
        {/* Dynamic Content */}
        <div className="relative z-10 w-full max-w-md animate-scale-in">
          {step === 1 && (
            <div className="flex flex-col items-center text-center gap-6">
              <div className="h-24 w-24 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center shadow-elevated">
                <User className="h-10 w-10 text-[var(--color-brand-400)]" />
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Who are you?</h2>
              <p className="text-[var(--color-text-secondary)] text-lg">
                Your body metrics form the foundation of our Calorie Engine. We use this to establish a highly accurate baseline.
              </p>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col items-center text-center gap-6">
              <div className="h-24 w-24 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center shadow-elevated">
                <Target className="h-10 w-10 text-[var(--color-accent-400)]" />
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">What&apos;s the mission?</h2>
              <p className="text-[var(--color-text-secondary)] text-lg">
                Whether you want to build mass, shred fat, or optimize for performance, we adapt your macros dynamically.
              </p>
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col items-center text-center gap-6">
              <div className="h-24 w-24 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center shadow-elevated">
                <Dumbbell className="h-10 w-10 text-[var(--color-highlight-500)]" />
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">How do you move?</h2>
              <p className="text-[var(--color-text-secondary)] text-lg">
                We combine your training frequency and style with your goals to recommend the perfect balance of recovery and fuel.
              </p>
            </div>
          )}
          {step === 4 && (
            <div className="flex flex-col items-center text-center gap-6">
              <div className="h-24 w-24 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center shadow-elevated">
                <Utensils className="h-10 w-10 text-[var(--color-success-400)]" />
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">How do you eat?</h2>
              <p className="text-[var(--color-text-secondary)] text-lg">
                FitStack adapts to any dietary lifestyle. Your macros will perfectly reflect what you actually want to eat.
              </p>
            </div>
          )}
          {step === 5 && (
            <div className="flex flex-col items-center text-center gap-6">
               <div className="h-24 w-24 rounded-2xl brand-gradient flex items-center justify-center shadow-[var(--shadow-glow-brand)]">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">You&apos;re ready.</h2>
              <p className="text-[var(--color-text-secondary)] text-lg">
                We&apos;ve crunched the numbers. Your personalized FitStack dashboard is ready to go. Let&apos;s get to work.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
