"use client";

import { useState } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Play, Activity } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function CalendarClient({ initialSessions, userId }: { initialSessions: any[], userId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState(initialSessions);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMonthSessions = async (date: Date) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workout/calendar?date=${date.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const nextMonth = () => {
    const next = addMonths(currentDate, 1);
    setCurrentDate(next);
    fetchMonthSessions(next);
  };

  const prevMonth = () => {
    const prev = subMonths(currentDate, 1);
    setCurrentDate(prev);
    fetchMonthSessions(prev);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Compute metrics
  const completedSessions = sessions.filter(s => s.status === "COMPLETED");
  const adherence = sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0;
  
  return (
    <div className="mx-auto max-w-5xl animate-fade-in pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/workout" className="rounded-full p-2 hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Training Calendar</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Your complete workout history and schedule.</p>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">Completed</h3>
          <p className="mt-2 text-3xl font-black text-[var(--color-text-primary)]">{completedSessions.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">Planned</h3>
          <p className="mt-2 text-3xl font-black text-[var(--color-text-primary)]">{sessions.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">Adherence</h3>
          <p className="mt-2 text-3xl font-black text-[var(--color-brand-400)]">{adherence}%</p>
        </div>
      </div>

      {/* Calendar UI */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-[var(--color-background)] transition-colors text-[var(--color-text-primary)]">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-[var(--color-background)] transition-colors text-[var(--color-text-primary)]">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-background)]/50">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              {day}
            </div>
          ))}
        </div>

        <div className={cn("grid grid-cols-7 transition-opacity", isLoading ? "opacity-50" : "opacity-100")}>
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const daySessions = sessions.filter(s => isSameDay(new Date(s.date), day));
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "min-h-[120px] border-b border-r border-[var(--color-border)] p-2 transition-colors hover:bg-[var(--color-background)] cursor-pointer group",
                  !isCurrentMonth ? "bg-[var(--color-background)]/30 opacity-40" : "",
                  idx % 7 === 6 ? "border-r-0" : "" // Remove right border for Sunday
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    isToday ? "bg-[var(--color-brand-500)] text-white shadow-[var(--shadow-glow-brand)]" : "text-[var(--color-text-primary)]"
                  )}>
                    {format(day, "d")}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {daySessions.map(session => (
                    <div 
                      key={session.id} 
                      className={cn(
                        "rounded px-2 py-1 text-xs font-bold border truncate",
                        session.status === "COMPLETED" ? "bg-[var(--color-success-500)]/10 border-[var(--color-success-500)]/20 text-[var(--color-success-400)]" :
                        session.status === "SKIPPED" ? "bg-[var(--color-warning-500)]/10 border-[var(--color-warning-500)]/20 text-[var(--color-warning-400)]" :
                        "bg-[var(--color-highlight-500)]/10 border-[var(--color-highlight-500)]/20 text-[var(--color-highlight-400)]"
                      )}
                    >
                      {session.name}
                    </div>
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
