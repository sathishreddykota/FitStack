"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isSameDay, startOfWeek, addDays } from "date-fns";
import { Dumbbell, Calendar as CalendarIcon, Play, X, RotateCcw, Plus, Activity } from "lucide-react";
import { toast } from "sonner";

interface WorkoutHubProps {
  initialSessions: any[];
  userId: string;
}

export function WorkoutHubClient({ initialSessions, userId }: WorkoutHubProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });

  const today = new Date();
  today.setHours(0,0,0,0);

  // Find the selected session (instead of always today)
  const selectedSession = sessions.find(s => isSameDay(new Date(s.date), selectedDate));
  
  // Weekly Strip Logic
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handleAction = async (sessionId: string, action: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/workout/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      
      if (!res.ok) throw new Error("Failed to update session");
      
      const { session } = await res.json();
      
      if (action === "START") {
        router.push(`/workout/session/${sessionId}`);
      } else {
        toast.success(`Workout ${action.toLowerCase()}ed`);
        setSessions(prev => prev.map(s => s.id === sessionId ? session : s));
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateCustomSession = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/workout/session", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create session");
      const { session } = await res.json();
      router.push(`/workout/session/${session.id}`);
    } catch (error: any) {
      toast.error(error.message);
      setIsCreating(false);
    }
  };

  return (
    <div className="theme-workout min-h-screen bg-[var(--color-surface-0)] text-[var(--color-text-primary)] -mx-4 -mt-4 px-4 pt-8 pb-20 sm:-m-8 sm:p-8 space-y-12 animate-fade-in font-sans">
      {/* ── Header ──────────────────────── */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-block transform -skew-x-12 bg-[var(--color-brand-500)] px-3 py-1 mb-2">
              <span className="block transform skew-x-12 text-[10px] font-black uppercase tracking-widest text-black">
                Personal Training Engine
              </span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-white leading-none">
              Forge Your<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-400)]">
                Best Self
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/workout/calendar"
              className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:border-[var(--color-brand-500)] hover:text-[var(--color-brand-500)] transition-all"
            >
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </Link>
            <Link
              href="/workout/plan/new"
              className="flex items-center gap-2 rounded-full border border-transparent bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black hover:bg-[var(--color-brand-500)] hover:text-black transition-all"
            >
              <Plus className="h-4 w-4" />
              New Plan
            </Link>
          </div>
        </div>
        
        {/* Background slanted graphic */}
        <div className="absolute top-1/2 left-0 w-full h-32 bg-[var(--color-surface-1)] -skew-y-3 -z-10 opacity-50 transform -translate-y-1/2 rounded-3xl blur-2xl"></div>
      </div>

      {/* ── Weekly Strip ──────────────────────── */}
      <section>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {weekDays.map(date => {
            const isToday = isSameDay(date, today);
            const daySession = sessions.find(s => isSameDay(new Date(s.date), date));
            
            let statusIcon = null;
            let bgColor = "bg-[var(--color-surface-1)]";
            let borderColor = "border-[var(--color-border)]";
            let textColor = "text-[var(--color-text-muted)]";
            
            if (daySession) {
              if (daySession.status === "COMPLETED") {
                bgColor = "bg-[var(--color-brand-500)]/10";
                borderColor = "border-[var(--color-brand-500)]/30";
                statusIcon = <span className="text-[10px] text-[var(--color-brand-400)]">✓</span>;
              } else if (daySession.status === "SKIPPED") {
                statusIcon = <span className="text-[10px] text-red-500">⏭</span>;
              } else if (daySession.status === "IN_PROGRESS") {
                statusIcon = <span className="text-[10px] text-[var(--color-brand-400)]">▶</span>;
              } else {
                statusIcon = <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]"></div>;
              }
            }

            const isSelected = isSameDay(date, selectedDate);

            if (isToday) {
              bgColor = "bg-[var(--color-surface-2)]";
              textColor = "text-white";
            }
            if (isSelected) {
              borderColor = "border-[var(--color-brand-500)]";
              textColor = "text-white";
            }

            return (
              <button 
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center rounded-full border ${borderColor} ${bgColor} py-4 sm:py-5 transition-all ${isSelected ? 'shadow-[0_0_15px_rgba(255,87,34,0.3)] scale-105' : 'hover:border-[var(--color-brand-500)]/50'}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isToday ? 'text-[var(--color-brand-400)]' : 'text-[var(--color-text-muted)]'}`}>
                  {format(date, "EEE")}
                </span>
                <span className={`text-xl sm:text-2xl font-black ${textColor}`}>
                  {format(date, "d")}
                </span>
                <div className="mt-1 h-3 flex items-center justify-center">
                  {statusIcon}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Selected Training ──────────────────────── */}
      <section className="relative">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
          {isSameDay(selectedDate, today) ? "Today's Training" : format(selectedDate, "EEEE's Training")}
        </h2>
        {/* Glow behind card */}
        <div className="absolute inset-0 bg-[var(--color-brand-500)] opacity-10 blur-[100px] rounded-full mt-8"></div>
        
        {selectedSession ? (
          <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-8 sm:p-10 shadow-elevated relative overflow-hidden group">
            
            {/* Ambient inner glow */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-[var(--color-brand-500)] opacity-20 rounded-full blur-3xl group-hover:opacity-30 transition-opacity duration-700 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-10">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-400)] mb-4">
                  <Activity className="h-3 w-3" />
                  {selectedSession.status === "COMPLETED" ? "Mission Accomplished" : "Daily Objective"}
                </div>
                <h3 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white mb-2">{selectedSession.name}</h3>
                <p className="text-lg text-[var(--color-text-secondary)] font-medium mb-6">
                  {selectedSession.exercises?.length || 0} exercises scheduled
                </p>

                {/* Exercises List */}
                {selectedSession.exercises && selectedSession.exercises.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {selectedSession.exercises.map((ex: any, idx: number) => (
                      <div key={ex.id} className="flex items-center justify-between rounded-xl bg-[var(--color-surface-2)] px-4 py-3 border border-[var(--color-border-subtle)]">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-[var(--color-brand-500)]">{idx + 1}</span>
                          <span className="text-sm font-bold text-white">{ex.exercise?.name || "Unknown Exercise"}</span>
                        </div>
                        <div className="text-xs font-semibold text-[var(--color-text-muted)]">
                          {ex.targetSets || 0} sets × {ex.targetReps || "reps"} 
                          {ex.targetWeightKg ? ` @ ${ex.targetWeightKg}kg` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedSession.status === "COMPLETED" && (
                  <p className="mt-2 text-sm font-bold uppercase tracking-wider text-[var(--color-brand-400)] flex items-center gap-3 bg-[var(--color-brand-500)]/10 inline-flex px-4 py-2 rounded-full">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-black">✓</span>
                    You crushed this workout!
                  </p>
                )}
              </div>
              
              {selectedSession.status !== "COMPLETED" && (
                <div className="flex flex-col gap-3 w-full md:w-[280px] justify-center shrink-0">
                  {selectedSession.status !== "SKIPPED" && (
                    <button 
                      onClick={() => handleAction(selectedSession.id, "START")}
                      disabled={isUpdating}
                      className="flex items-center justify-center gap-3 rounded-full bg-[var(--color-brand-500)] py-4 px-8 text-sm font-black uppercase tracking-widest text-black shadow-glow-highlight hover:bg-white transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Commence
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {selectedSession.status !== "SKIPPED" ? (
                      <button 
                        onClick={() => handleAction(selectedSession.id, "SKIP")}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-text-muted)] transition-colors disabled:opacity-50"
                      >
                        <X className="h-3 w-3" /> Skip
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAction(selectedSession.id, "START")}
                        disabled={isUpdating}
                        className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-brand-500)]/50 bg-[var(--color-surface-2)] py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-400)] hover:bg-[var(--color-brand-500)]/10 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" /> Undo Skip
                      </button>
                    )}
                    <button 
                      disabled={isUpdating}
                      onClick={() => toast.info("Reschedule flow coming soon")}
                      className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-text-muted)] transition-colors disabled:opacity-50"
                    >
                      <CalendarIcon className="h-3 w-3" /> Move
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-1)] py-16 px-6 text-center shadow-elevated">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-3)] text-[var(--color-text-muted)] mb-6 shadow-inner">
              <Dumbbell className="h-8 w-8" />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Active Recovery</h3>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)] font-medium max-w-sm">
              Your body grows while resting. No scheduled sessions today.
            </p>
            <button
              onClick={handleCreateCustomSession}
              disabled={isCreating}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-lg hover:bg-[var(--color-brand-500)] transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? "Initializing..." : "Force Override (Custom)"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
