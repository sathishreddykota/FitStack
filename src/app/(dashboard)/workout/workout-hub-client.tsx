"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Calendar as CalendarIcon, Dumbbell, Play, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { addDays } from "@/server/dates";
import { cn } from "@/lib/utils";

type Status = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "MISSED";

interface HubSession {
  id: string;
  name: string;
  day: string;
  status: Status;
  durationMinutes: number | null;
  exercises: { id: string; name: string; targetSets: number | null; targetReps: string | null; targetWeightKg: number | null }[];
}

interface Props {
  today: string;
  weekStart: string;
  initialSessions: HubSession[];
  planName: string | null;
  isPro: boolean;
}

const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

export function WorkoutHubClient({ today, weekStart, initialSessions, planName, isPro }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [selected, setSelected] = useState(today);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveTo, setMoveTo] = useState(addDays(today, 1));

  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const daySessions = sessions.filter((s) => s.day === selected);
  const session = daySessions.find((s) => s.status === "IN_PROGRESS") ?? daySessions[0];

  const act = async (id: string, body: Record<string, unknown>, msg?: string) => {
    setBusy(true);
    try {
      const updated = await api<{ id: string; status: Status; date: string }>(`/api/workout/session/${id}`, {
        method: "PATCH",
        body,
      });
      if (body.action === "START") return router.push(`/workout/session/${id}`);
      const newDay = updated.date.slice(0, 10);
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status: updated.status, day: newDay } : s)));
      if (msg) toast.success(msg);
      setMoving(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const startCustom = async () => {
    setBusy(true);
    try {
      const created = await api<{ id: string }>("/api/workout/session", { body: { date: selected, start: true } });
      router.push(`/workout/session/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="theme-workout -mx-4 -mt-4 min-h-screen space-y-10 bg-[var(--color-surface-0)] px-4 pb-24 pt-8 text-[var(--color-text-primary)] sm:-m-8 sm:p-8">
      <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-400)]">
            {planName ?? "No plan yet"}
          </p>
          <h1 className="text-5xl font-black uppercase leading-none tracking-tighter text-white sm:text-6xl">Train</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/workout/calendar"
            className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:border-[var(--color-brand-500)]"
          >
            <CalendarIcon className="h-4 w-4" /> Calendar
          </Link>
          <Link
            href="/workout/plan/new"
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black hover:bg-[var(--color-brand-500)]"
          >
            <Plus className="h-4 w-4" /> {planName ? "New plan" : "Build my plan"}
          </Link>
        </div>
      </header>

      {/* Week strip */}
      <nav className="grid grid-cols-7 gap-1.5 sm:gap-3" aria-label="This week">
        {week.map((day) => {
          const s = sessions.find((x) => x.day === day);
          const isSel = day === selected;
          return (
            <button
              key={day}
              onClick={() => setSelected(day)}
              className={cn(
                "flex flex-col items-center rounded-full border py-3 transition-all sm:py-5",
                isSel ? "scale-105 border-[var(--color-brand-500)]" : "border-[var(--color-border)]",
                day === today ? "bg-[var(--color-surface-2)]" : "bg-[var(--color-surface-1)]",
                s?.status === "COMPLETED" && "bg-[var(--color-brand-500)]/10",
              )}
            >
              <span className={cn("text-[10px] font-black uppercase", day === today ? "text-[var(--color-brand-400)]" : "text-[var(--color-text-muted)]")}>
                {dayLabel(day, { weekday: "short" })}
              </span>
              <span className="text-lg font-black text-white sm:text-2xl">{Number(day.slice(8))}</span>
              <span className="mt-1 h-3 text-[10px]">
                {s?.status === "COMPLETED" ? "✓" : s?.status === "SKIPPED" || s?.status === "MISSED" ? "–" : s ? "•" : ""}
              </span>
            </button>
          );
        })}
      </nav>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {selected === today ? "Today" : dayLabel(selected, { weekday: "long", day: "numeric", month: "short" })}
        </h2>

        {session ? (
          <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6 sm:p-10">
            <div className="flex flex-col justify-between gap-8 md:flex-row">
              <div className="flex-1">
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-400)]">
                  <Activity className="h-3 w-3" /> {session.status.replace("_", " ")}
                  {session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}
                </span>
                <h3 className="mb-4 text-4xl font-black uppercase tracking-tighter text-white">{session.name}</h3>
                {session.exercises.length > 0 ? (
                  <ol className="space-y-2">
                    {session.exercises.map((ex, i) => (
                      <li key={ex.id} className="flex items-center justify-between rounded-xl bg-[var(--color-surface-2)] px-4 py-3">
                        <span className="flex items-center gap-3 text-sm font-bold text-white">
                          <span className="text-[10px] text-[var(--color-brand-500)]">{i + 1}</span>
                          {ex.name}
                        </span>
                        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                          {ex.targetSets ?? "—"} × {ex.targetReps ?? "—"}
                          {ex.targetWeightKg ? ` @ ${ex.targetWeightKg}kg` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)]">No exercises yet — add them as you train.</p>
                )}
              </div>

              {session.status !== "COMPLETED" ? (
                <div className="flex w-full shrink-0 flex-col justify-center gap-3 md:w-64">
                  <button
                    onClick={() => (session.status === "IN_PROGRESS" ? router.push(`/workout/session/${session.id}`) : act(session.id, { action: "START" }))}
                    disabled={busy}
                    className="flex items-center justify-center gap-3 rounded-full bg-[var(--color-brand-500)] px-8 py-4 text-sm font-black uppercase tracking-widest text-black hover:bg-white disabled:opacity-50"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {session.status === "IN_PROGRESS" ? "Continue" : "Start"}
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    {session.status === "SKIPPED" || session.status === "MISSED" ? (
                      <button
                        onClick={() => act(session.id, { action: "UNSKIP" }, "Back on the schedule")}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-400)]"
                      >
                        <RotateCcw className="h-3 w-3" /> Undo
                      </button>
                    ) : (
                      <button
                        onClick={() => act(session.id, { action: "SKIP" }, "Workout skipped")}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-white"
                      >
                        <X className="h-3 w-3" /> Skip
                      </button>
                    )}
                    <button
                      onClick={() => setMoving((m) => !m)}
                      disabled={busy}
                      className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-white"
                    >
                      <CalendarIcon className="h-3 w-3" /> Move
                    </button>
                  </div>
                  {moving && (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={moveTo}
                        min={today}
                        onChange={(e) => setMoveTo(e.target.value)}
                        className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-white"
                      />
                      <button
                        onClick={() => act(session.id, { action: "RESCHEDULE", newDate: moveTo }, `Moved to ${moveTo}`)}
                        disabled={busy || !moveTo}
                        className="rounded-xl bg-white px-4 text-xs font-black uppercase text-black"
                      >
                        Move
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/workout/session/${session.id}`}
                  className="self-start rounded-full border border-[var(--color-border)] px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:border-[var(--color-brand-500)]"
                >
                  View workout
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-6 py-16 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-3)] text-[var(--color-text-muted)]">
              <Dumbbell className="h-8 w-8" />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter text-white">
              {planName ? "Rest day" : "No workout planned"}
            </h3>
            <p className="mt-2 max-w-sm text-sm font-medium text-[var(--color-text-secondary)]">
              {planName
                ? "Recovery is where you grow. Or log an extra session."
                : isPro
                  ? "Build a plan in 30 seconds, or just log what you do today."
                  : "Log any workout for free. PRO builds you a full plan."}
            </p>
            {selected <= today && (
              <button
                onClick={startCustom}
                disabled={busy}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-xs font-black uppercase tracking-widest text-black hover:bg-[var(--color-brand-500)] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Log a workout
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
