"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Dumbbell, Globe, Save, Target, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { ACTIVITY_LEVEL_LABELS, GOAL_LABELS, TRAINING_STYLE_LABELS } from "@/lib/constants";

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));
const SEX = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other / prefer not to say" },
];
const EXPERIENCE = [
  { value: "BEGINNER", label: "Beginner (< 1 year)" },
  { value: "INTERMEDIATE", label: "Intermediate (1–3 years)" },
  { value: "ADVANCED", label: "Advanced (3+ years)" },
];
const CARDIO = [
  { value: "NONE", label: "None" },
  { value: "LIGHT", label: "Light" },
  { value: "MODERATE", label: "Moderate" },
  { value: "HEAVY", label: "Heavy" },
];
const DIET = [
  { value: "NO_PREFERENCE", label: "No preference" },
  { value: "HIGH_PROTEIN", label: "High protein" },
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "PESCATARIAN", label: "Pescatarian" },
  { value: "KETO", label: "Keto" },
];

type Profile = {
  age: number;
  sex: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: string;
  fitnessGoal: string;
  trainingStyle: string;
  trainingExperience: string;
  trainingDaysPerWeek: number;
  cardioPreference: string;
  dietaryPreference: string;
  timezone: string;
  caloriesToOverride: number | null;
};

interface Props {
  user: { name: string; email: string; avatarUrl: string | null };
  profile: Profile;
  targets: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; waterL: number | null };
}

const inputCls =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-400)] focus:outline-none";

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "block md:col-span-2" : "block"}>
      <span className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">{label}</span>
      {children}
    </label>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
        {icon} {title}
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function ProfileClient({ user, profile, targets }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [form, setForm] = useState<Profile>(profile);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm((f) => ({ ...f, [key]: value }));
  const num = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (e.target.value === "" ? 0 : Number(e.target.value)) as never);
  const sel = (key: keyof Profile) => (e: React.ChangeEvent<HTMLSelectElement>) => set(key, e.target.value as never);

  const detectTimezone = () => set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api("/api/user/profile", { method: "PATCH", body: { ...form, name: name.trim() || undefined } });
      toast.success("Profile saved. Your targets have been recalculated.");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update profile"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-2)]">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-8 w-8 text-[var(--color-text-muted)]" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{user.name || "My Profile"}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{user.email}</p>
        </div>
      </div>

      {targets.calories && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Calories", `${targets.calories} kcal`],
            ["Protein", `${targets.proteinG} g`],
            ["Carbs", `${targets.carbsG} g`],
            ["Fat", `${targets.fatG} g`],
            ["Water", `${targets.waterL} L`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
              <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{k}</p>
              <p className="mt-1 font-bold text-[var(--color-text-primary)]">{v}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Section icon={<Activity className="h-5 w-5 text-[var(--color-brand-400)]" />} title="Body">
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Age">
            <input type="number" min={13} max={100} className={inputCls} value={form.age} onChange={num("age")} />
          </Field>
          <Field label="Sex">
            <select className={inputCls} value={form.sex} onChange={sel("sex")}>
              {SEX.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Height (cm)">
            <input type="number" min={100} max={250} className={inputCls} value={form.heightCm} onChange={num("heightCm")} />
          </Field>
          <Field label="Current weight (kg)">
            <input type="number" step="0.1" min={30} max={300} className={inputCls} value={form.currentWeightKg} onChange={num("currentWeightKg")} />
          </Field>
          <Field label="Target weight (kg)">
            <input type="number" step="0.1" min={30} max={300} className={inputCls} value={form.targetWeightKg} onChange={num("targetWeightKg")} />
          </Field>
        </Section>

        <Section icon={<Target className="h-5 w-5 text-[var(--color-accent-400)]" />} title="Goals & nutrition">
          <Field label="Goal">
            <select className={inputCls} value={form.fitnessGoal} onChange={sel("fitnessGoal")}>
              {opts(GOAL_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Diet">
            <select className={inputCls} value={form.dietaryPreference} onChange={sel("dietaryPreference")}>
              {DIET.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Activity level" wide>
            <select className={inputCls} value={form.activityLevel} onChange={sel("activityLevel")}>
              {opts(ACTIVITY_LEVEL_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Custom calorie target (optional)" wide>
            <input
              type="number"
              min={1000}
              max={6000}
              placeholder="Leave empty to use the calculated target"
              className={inputCls}
              value={form.caloriesToOverride ?? ""}
              onChange={(e) => set("caloriesToOverride", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
        </Section>

        <Section icon={<Dumbbell className="h-5 w-5 text-[var(--color-highlight-400)]" />} title="Training">
          <Field label="Style">
            <select className={inputCls} value={form.trainingStyle} onChange={sel("trainingStyle")}>
              {opts(TRAINING_STYLE_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Experience">
            <select className={inputCls} value={form.trainingExperience} onChange={sel("trainingExperience")}>
              {EXPERIENCE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Training days per week">
            <input type="number" min={1} max={7} className={inputCls} value={form.trainingDaysPerWeek} onChange={num("trainingDaysPerWeek")} />
          </Field>
          <Field label="Cardio">
            <select className={inputCls} value={form.cardioPreference} onChange={sel("cardioPreference")}>
              {CARDIO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </Section>

        <Section icon={<Globe className="h-5 w-5 text-[var(--color-info-400)]" />} title="Region">
          <Field label="Timezone (decides when your day starts)" wide>
            <div className="flex gap-2">
              <input className={inputCls} value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
              <button
                type="button"
                onClick={detectTimezone}
                className="shrink-0 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
              >
                Detect
              </button>
            </div>
          </Field>
        </Section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-brand-500)] px-8 py-3 font-bold text-[var(--color-on-brand)] transition-all hover:bg-[var(--color-brand-600)] active:scale-95 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : (<><Save className="h-4 w-4" /> Save profile</>)}
          </button>
        </div>
      </form>
    </div>
  );
}
