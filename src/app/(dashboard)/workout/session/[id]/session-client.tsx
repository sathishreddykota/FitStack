"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, Loader2, Mic, Plus, Sparkles, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/use-speech";
import { ExerciseSearchModal } from "@/components/workout/exercise-search-modal";

// ─────────────────────────────────────────────
// Live workout logger. Every change is its own small API call that returns
// the saved row (with its real id) — no background "sync" of the whole
// session, so nothing can be duplicated or lost.
// ─────────────────────────────────────────────

export interface SetData {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  completedAt: string | null;
  isPersonalRecord: boolean;
}
export interface ExerciseData {
  id: string;
  exerciseId: string;
  targetSets: number | null;
  targetReps: string | null;
  targetWeightKg: number | null;
  exercise: { id: string; name: string };
  sets: SetData[];
}
export interface SessionData {
  id: string;
  name: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "MISSED";
  startedAt: string | null;
  durationMinutes: number | null;
  exercises: ExerciseData[];
  previous: Record<string, { weightKg: number | null; reps: number | null }[]>;
}

const REST_SECONDS = 90;

function useElapsed(startedAt: string | null, running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!startedAt) return null;
  const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SessionClient({ initial, isPro }: { initial: SessionData; isPro: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [rest, setRest] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicText, setMagicText] = useState("");
  const speech = useSpeech(setMagicText);

  const done = session.status === "COMPLETED";
  const elapsed = useElapsed(session.startedAt, !done);

  useEffect(() => {
    if (rest <= 0) return;
    const t = setTimeout(() => setRest((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  const reload = useCallback(async () => {
    setSession(await api<SessionData>(`/api/workout/session/${session.id}`));
  }, [session.id]);

  const patchSetLocal = (setId: string, patch: Partial<SetData>) =>
    setSession((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) })),
    }));

  /** Save weight/reps when an input loses focus. */
  const saveField = async (set: SetData, field: "weightKg" | "reps", raw: string) => {
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (Number.isNaN(value) || value < 0)) return;
    if (value === set[field]) return;
    patchSetLocal(set.id, { [field]: value });
    try {
      const saved = await api<SetData>(`/api/workout/sets/${set.id}`, { method: "PATCH", body: { [field]: value } });
      patchSetLocal(set.id, saved);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save that set."));
    }
  };

  const toggleDone = async (set: SetData) => {
    const completing = !set.completedAt;
    // Read the inputs directly: the user may tap Done before the field's blur-save has landed.
    const read = (prefix: string, fallback: number | null) => {
      const el = document.getElementById(`${prefix}-${set.id}`) as HTMLInputElement | null;
      if (!el || el.value === "") return fallback;
      const n = Number(el.value);
      return Number.isNaN(n) || n < 0 ? fallback : n;
    };
    const weightKg = read("w", set.weightKg);
    const reps = read("r", set.reps);
    if (completing && !reps) {
      toast.error("Enter reps first.");
      return;
    }
    setBusy(set.id);
    try {
      const saved = await api<SetData>(`/api/workout/sets/${set.id}`, {
        method: "PATCH",
        body: completing ? { completed: true, weightKg, reps: Math.round(reps!) } : { completed: false },
      });
      patchSetLocal(set.id, saved);
      if (completing) {
        setRest(REST_SECONDS);
        if (session.status !== "IN_PROGRESS") setSession((s) => ({ ...s, status: "IN_PROGRESS", startedAt: s.startedAt ?? new Date().toISOString() }));
        if (saved.isPersonalRecord) toast.success("🏆 New personal record!");
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const addSet = async (ex: ExerciseData) => {
    setBusy(ex.id);
    try {
      const saved = await api<SetData>(`/api/workout/session-exercises/${ex.id}/sets`, { method: "POST" });
      setSession((s) => ({
        ...s,
        exercises: s.exercises.map((e) => (e.id === ex.id ? { ...e, sets: [...e.sets, saved] } : e)),
      }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const deleteSet = async (set: SetData) => {
    try {
      await api(`/api/workout/sets/${set.id}`, { method: "DELETE" });
      await reload(); // set numbers are renumbered server-side
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const addExercise = async (exercise: { id: string }) => {
    setPickerOpen(false);
    try {
      const created = await api<ExerciseData>(`/api/workout/session/${session.id}/exercises`, {
        body: { exerciseId: exercise.id },
      });
      await reload();
      toast.success(`${created.exercise.name} added`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const removeExercise = async (ex: ExerciseData) => {
    if (!confirm(`Remove ${ex.exercise.name} and its sets?`)) return;
    try {
      await api(`/api/workout/session-exercises/${ex.id}`, { method: "DELETE" });
      setSession((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== ex.id) }));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const finish = async () => {
    setBusy("finish");
    try {
      const s = await api<{ durationMinutes: number }>(`/api/workout/session/${session.id}`, {
        method: "PATCH",
        body: { action: "COMPLETE" },
      });
      toast.success(`Workout done in ${s.durationMinutes} min 💪`);
      router.push("/workout");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  };

  const submitMagic = async () => {
    if (!magicText.trim()) return;
    speech.stop();
    setBusy("magic");
    try {
      const r = await api<{ added: { name: string; sets: number }[]; skipped: number }>(
        `/api/workout/session/${session.id}/magic`,
        { body: { text: magicText } },
      );
      toast.success(`Added ${r.added.map((a) => `${a.name} (${a.sets})`).join(", ")}`);
      if (r.skipped) toast.info(`${r.skipped} exercise(s) weren't recognised.`);
      setMagicText("");
      setMagicOpen(false);
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.isProRequired) router.push("/settings/subscription");
      else toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const completedSets = session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completedAt).length, 0);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in pb-32">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-0)]/90 p-4 backdrop-blur">
        <Link href="/workout" aria-label="Back" className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-lg font-bold text-[var(--color-text-primary)]">{session.name}</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {done ? `Completed · ${session.durationMinutes ?? "—"} min` : elapsed ? `${elapsed} · ${completedSets} sets` : "Not started"}
          </p>
        </div>
        {!done ? (
          <button
            onClick={finish}
            disabled={busy === "finish" || completedSets === 0}
            className="rounded-xl bg-[var(--color-brand-500)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] disabled:opacity-40"
          >
            {busy === "finish" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish"}
          </button>
        ) : (
          <span className="w-16" />
        )}
      </div>

      {rest > 0 && (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--color-brand-500)]/30 bg-[var(--color-surface-1)] px-6 py-3 shadow-xl">
          <Clock className="h-5 w-5 animate-pulse text-[var(--color-brand-400)]" />
          <span className="font-mono text-xl font-bold text-[var(--color-text-primary)]">
            {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
          </span>
          <button onClick={() => setRest((r) => r + 30)} className="text-xs font-semibold text-[var(--color-text-muted)]">
            +30s
          </button>
          <button onClick={() => setRest(0)} className="text-xs font-semibold text-[var(--color-text-muted)]">
            Skip
          </button>
        </div>
      )}

      <div className="space-y-6 p-4">
        {session.exercises.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            Add your first exercise to start logging.
          </p>
        )}

        {session.exercises.map((ex) => {
          const prev = session.previous[ex.exerciseId];
          return (
            <div key={ex.id} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
              <div className="flex items-start justify-between gap-3 bg-[var(--color-surface-2)] p-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{ex.exercise.name}</h2>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {ex.targetSets && ex.targetReps ? `Target ${ex.targetSets} × ${ex.targetReps}` : "No target"}
                    {prev?.length ? ` · Last: ${prev.map((p) => `${p.weightKg ?? "BW"}×${p.reps ?? "?"}`).join(", ")}` : ""}
                  </p>
                </div>
                {!done && (
                  <button onClick={() => removeExercise(ex)} aria-label="Remove exercise" className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error-400)]">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2 p-4">
                <div className="grid grid-cols-[2.5rem_1fr_1fr_2.75rem_2rem] gap-2 text-center text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                  <span>Set</span>
                  <span>kg</span>
                  <span>Reps</span>
                  <span>Done</span>
                  <span />
                </div>
                {ex.sets.map((set) => {
                  const completed = !!set.completedAt;
                  return (
                    <div key={set.id} className={cn("grid grid-cols-[2.5rem_1fr_1fr_2.75rem_2rem] items-center gap-2", completed && "opacity-70")}>
                      <span className="flex items-center justify-center gap-1 text-sm font-semibold text-[var(--color-text-muted)]">
                        {set.isPersonalRecord ? <Trophy className="fs-pop h-4 w-4 text-[var(--color-accent-400)]" /> : set.setNumber}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min={0}
                        defaultValue={set.weightKg ?? ""}
                        key={`w-${set.id}-${set.weightKg}`}
                        id={`w-${set.id}`}
                        disabled={completed || done}
                        onBlur={(e) => saveField(set, "weightKg", e.target.value)}
                        placeholder="—"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-0)] p-2 text-center font-bold text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none disabled:bg-transparent"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        defaultValue={set.reps ?? ""}
                        key={`r-${set.id}-${set.reps}`}
                        id={`r-${set.id}`}
                        disabled={completed || done}
                        onBlur={(e) => saveField(set, "reps", e.target.value)}
                        placeholder="—"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-0)] p-2 text-center font-bold text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none disabled:bg-transparent"
                      />
                      <button
                        onClick={() => toggleDone(set)}
                        disabled={busy === set.id || done}
                        aria-label={completed ? "Mark not done" : "Mark done"}
                        className={cn(
                          "mx-auto flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                          completed
                            ? "border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/20 text-[var(--color-success-400)]"
                            : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)]",
                        )}
                      >
                        {busy === set.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                      </button>
                      {!done && !completed ? (
                        <button onClick={() => deleteSet(set)} aria-label="Delete set" className="text-[var(--color-text-muted)] hover:text-[var(--color-error-400)]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
                {!done && (
                  <button
                    onClick={() => addSet(ex)}
                    disabled={busy === ex.id}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-3 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    <Plus className="h-4 w-4" /> Add set
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!done && (
          <>
            <button
              onClick={() => setPickerOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm font-bold text-[var(--color-brand-400)]"
            >
              <Plus className="h-5 w-5" /> Add exercise
            </button>

            {!magicOpen ? (
              <button
                onClick={() => (isPro ? setMagicOpen(true) : router.push("/settings/subscription"))}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 text-sm font-bold text-[var(--color-text-primary)]"
              >
                <Sparkles className="h-5 w-5 text-[var(--color-brand-400)]" /> Log by voice or text {!isPro && "· PRO"}
              </button>
            ) : (
              <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
                <div className="relative">
                  <textarea
                    autoFocus
                    rows={2}
                    placeholder="e.g. bench press 3 sets of 8 at 60 kg, then pull-ups 3x10"
                    value={magicText}
                    onChange={(e) => setMagicText(e.target.value)}
                    disabled={busy === "magic"}
                    className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-0)] px-4 py-3 pr-12 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
                  />
                  {speech.supported && (
                    <button
                      type="button"
                      onClick={() => (speech.listening ? speech.stop() : speech.start(magicText, (m) => toast.error(m)))}
                      aria-label={speech.listening ? "Stop listening" : "Speak"}
                      className={cn("absolute right-3 top-3 rounded-md p-1.5", speech.listening ? "animate-pulse bg-[var(--color-error-500)]/10 text-[var(--color-error-500)]" : "text-[var(--color-text-muted)]")}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitMagic}
                    disabled={!magicText.trim() || busy === "magic"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-500)] py-3 text-sm font-bold text-[var(--color-on-brand)] disabled:opacity-50"
                  >
                    {busy === "magic" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {busy === "magic" ? "Reading…" : "Add to workout"}
                  </button>
                  <button
                    onClick={() => {
                      speech.stop();
                      setMagicOpen(false);
                    }}
                    className="rounded-lg border border-[var(--color-border)] px-5 text-sm font-bold text-[var(--color-text-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ExerciseSearchModal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} />
    </div>
  );
}
