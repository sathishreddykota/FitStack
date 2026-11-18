"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { addDays, eachDay, endOfMonth, startOfWeek } from "@/server/dates";
import { cn } from "@/lib/utils";

export interface CalendarSession {
  id: string;
  name: string;
  day: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "MISSED";
}

const STATUS_CLS: Record<CalendarSession["status"], string> = {
  COMPLETED: "bg-[var(--color-success-500)]/10 border-[var(--color-success-500)]/20 text-[var(--color-success-400)]",
  IN_PROGRESS: "bg-[var(--color-brand-500)]/10 border-[var(--color-brand-500)]/30 text-[var(--color-brand-400)]",
  SKIPPED: "bg-[var(--color-warning-500)]/10 border-[var(--color-warning-500)]/20 text-[var(--color-warning-400)] line-through",
  MISSED: "bg-red-500/5 border-red-500/20 text-red-400 line-through",
  PLANNED: "bg-[var(--color-highlight-500)]/10 border-[var(--color-highlight-500)]/20 text-[var(--color-highlight-400)]",
};

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function CalendarClient({ today, initialSessions }: { today: string; initialSessions: CalendarSession[] }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sessions, setSessions] = useState(initialSessions);
  const [loading, setLoading] = useState(false);

  const go = async (delta: number) => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setLoading(true);
    try {
      const data = await api<{ sessions: CalendarSession[] }>(`/api/workout/calendar?month=${next}`);
      setSessions(data.sessions.map((s) => ({ id: s.id, name: s.name, day: s.day, status: s.status })));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const first = `${month}-01`;
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(startOfWeek(endOfMonth(first)), 6);
  const days = eachDay(gridStart, gridEnd);

  // Adherence counts only sessions that are already due.
  const due = sessions.filter((s) => s.day <= today);
  const completed = due.filter((s) => s.status === "COMPLETED").length;
  const adherence = due.length ? Math.round((completed / due.length) * 100) : 0;
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${first}T00:00:00Z`),
  );

  return (
    <div className="mx-auto max-w-5xl animate-fade-in pb-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/workout" aria-label="Back" className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-1)]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Training Calendar</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Your schedule and history.</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        {[
          ["Completed", String(completed)],
          ["Scheduled", String(sessions.length)],
          ["Adherence", `${adherence}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 sm:p-6">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] sm:text-sm">{k}</p>
            <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)] sm:text-3xl">{v}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{monthLabel}</h2>
          <div className="flex gap-2">
            <button onClick={() => go(-1)} aria-label="Previous month" className="rounded-lg p-2 text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(1)} aria-label="Next month" className="rounded-lg p-2 text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              {d}
            </div>
          ))}
        </div>
        <div className={cn("grid grid-cols-7 transition-opacity", loading && "opacity-50")}>
          {days.map((day, i) => {
            const inMonth = day.startsWith(month);
            const list = sessions.filter((s) => s.day === day);
            return (
              <div
                key={day}
                className={cn(
                  "min-h-[88px] border-b border-r border-[var(--color-border)] p-1.5 sm:min-h-[120px] sm:p-2",
                  !inMonth && "opacity-40",
                  i % 7 === 6 && "border-r-0",
                )}
              >
                <span
                  className={cn(
                    "mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    day === today ? "bg-[var(--color-brand-500)] text-[var(--color-on-brand)]" : "text-[var(--color-text-primary)]",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <div className="space-y-1">
                  {list.map((s) => (
                    <Link
                      key={s.id}
                      href={`/workout/session/${s.id}`}
                      className={cn("block truncate rounded border px-1.5 py-1 text-[10px] font-bold sm:text-xs", STATUS_CLS[s.status])}
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
