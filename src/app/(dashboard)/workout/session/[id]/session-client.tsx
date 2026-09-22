"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Play, Plus, Trash2, Clock, Check, Mic, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExerciseSearchModal } from "@/components/workout/exercise-search-modal";

export function SessionClient({ session, userId }: { session: any, userId: string }) {
  const router = useRouter();
  const [exercises, setExercises] = useState(session.exercises);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isMagicLogging, setIsMagicLogging] = useState(false);
  const [magicText, setMagicText] = useState("");

  const recognitionRef = useRef<any>(null);

  // Auto-sync debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      syncSession();
    }, 5000);
    return () => clearTimeout(timer);
  }, [exercises]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer !== null && activeTimer > 0) {
      interval = setInterval(() => {
        setActiveTimer((prev) => (prev ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const syncSession = async () => {
    setIsSyncing(true);
    try {
      await fetch(`/api/workout/session/${session.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises }),
      });
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateSet = (exIndex: number, setIndex: number, field: string, value: any) => {
    const newExercises = [...exercises];
    newExercises[exIndex].sets[setIndex][field] = value;
    
    // Auto-check if both reps and weight are filled
    const set = newExercises[exIndex].sets[setIndex];
    if (field === 'completedAt' && value !== null) {
       // Started rest timer on set complete
       setActiveTimer(90); // 90s default rest
    }

    setExercises(newExercises);
  };

  const toggleSetComplete = (exIndex: number, setIndex: number) => {
    const set = exercises[exIndex].sets[setIndex];
    const isCompleted = !!set.completedAt;
    handleUpdateSet(exIndex, setIndex, "completedAt", isCompleted ? null : new Date().toISOString());
  };

  const addSet = (exIndex: number) => {
    const newExercises = [...exercises];
    const ex = newExercises[exIndex];
    const lastSet = ex.sets[ex.sets.length - 1];
    
    ex.sets.push({
      id: `temp-${Date.now()}`,
      sessionExerciseId: ex.id,
      setNumber: ex.sets.length + 1,
      weightKg: lastSet ? lastSet.weightKg : "",
      reps: lastSet ? lastSet.reps : "",
      completedAt: null,
    });
    setExercises(newExercises);
  };

  const addExercise = (exercise: any) => {
    const newEx = {
      id: `temp-ex-${Date.now()}`,
      exerciseId: exercise.id,
      sessionId: session.id,
      orderIndex: exercises.length,
      targetSets: 3,
      targetReps: 10,
      targetWeightKg: 0,
      exercise,
      sets: [
        {
          id: `temp-set-${Date.now()}`,
          setNumber: 1,
          weightKg: "",
          reps: "",
          completedAt: null
        }
      ]
    };
    setExercises([...exercises, newEx]);
  };

  const finishWorkout = async () => {
    await syncSession(); // Force sync first
    
    try {
      const res = await fetch(`/api/workout/session/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPLETE", durationMinutes: 60 }), // simplified duration
      });
      if (res.ok) {
        toast.success("Workout completed! Great job.");
        router.push("/workout");
      }
    } catch (e: any) {
      toast.error("Failed to complete workout");
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice recognition is not supported in this browser.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true; // Keep listening until they stop
    recognition.interimResults = true; // Show text as they speak
    recognition.lang = 'en-US';

    let originalInput = magicText;
    if (originalInput && !originalInput.endsWith(' ')) {
      originalInput += ' ';
    }

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening... Click mic again to stop.");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      originalInput += finalTranscript;
      setMagicText(originalInput + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        toast.error("Voice recognition failed: " + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const submitMagicLog = async () => {
    if (!magicText.trim()) return;
    
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    
    setIsProcessingVoice(true);
    try {
      const res = await fetch(`/api/workout/session/${session.id}/magic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: magicText }),
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to process magic log");
      
      toast.success("Magically added exercises!");
      setMagicText("");
      setIsMagicLogging(false);
      
      // We should ideally fetch the latest session data from the server, or trigger a page refresh
      // For now, we'll reload the page to get the updated DB state with the exact exercise matches
      window.location.reload();
      
    } catch (error: any) {
      toast.error(error.message || "Failed to parse workout. Try again.");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-24 animate-fade-in">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur p-4">
        <Link href="/workout" className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{session.name}</h1>
        <button 
          onClick={finishWorkout}
          className="rounded-xl bg-[var(--color-brand-500)] px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110"
        >
          Finish
        </button>
      </div>

      {activeTimer !== null && activeTimer > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[var(--color-surface)] border border-[var(--color-brand-500)]/30 px-6 py-3 shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
           <Clock className="h-5 w-5 text-[var(--color-brand-400)] animate-pulse" />
           <span className="font-mono text-xl font-bold text-[var(--color-text-primary)]">
             {Math.floor(activeTimer / 60)}:{(activeTimer % 60).toString().padStart(2, "0")}
           </span>
           <button onClick={() => setActiveTimer(0)} className="ml-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-white">Skip</button>
        </div>
      )}

      <div className="p-4 space-y-6">
        {exercises.map((ex: any, exIndex: number) => (
          <div key={ex.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
            <div className="bg-[var(--color-border)]/50 p-4">
              <h2 className="font-bold text-[var(--color-text-primary)] text-lg">{ex.exercise.name}</h2>
              {ex.targetSets && ex.targetReps && (
                <p className="text-sm text-[var(--color-text-muted)] mt-1">Target: {ex.targetSets} sets × {ex.targetReps}</p>
              )}
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 mb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)] text-center">
                <div>Set</div>
                <div>kg</div>
                <div>Reps</div>
                <div>Done</div>
              </div>

              {ex.sets.map((set: any, setIndex: number) => {
                const isCompleted = !!set.completedAt;
                
                return (
                  <div key={set.id} className={cn("grid grid-cols-[3rem_1fr_1fr_3rem] gap-2 items-center transition-all", isCompleted ? "opacity-60" : "")}>
                    <div className="text-center font-semibold text-[var(--color-text-muted)] text-sm">
                      {set.setNumber}
                    </div>
                    <div>
                      <input 
                        type="number" 
                        value={set.weightKg || ""}
                        onChange={(e) => handleUpdateSet(exIndex, setIndex, "weightKg", Number(e.target.value))}
                        disabled={isCompleted}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-center font-bold text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none disabled:bg-transparent"
                        placeholder="—"
                      />
                    </div>
                    <div>
                      <input 
                        type="number" 
                        value={set.reps || ""}
                        onChange={(e) => handleUpdateSet(exIndex, setIndex, "reps", Number(e.target.value))}
                        disabled={isCompleted}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2 text-center font-bold text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none disabled:bg-transparent"
                        placeholder="—"
                      />
                    </div>
                    <button
                      onClick={() => toggleSetComplete(exIndex, setIndex)}
                      className={cn(
                        "flex h-10 w-10 mx-auto items-center justify-center rounded-lg border transition-colors",
                        isCompleted 
                          ? "bg-[var(--color-success-500)]/20 border-[var(--color-success-500)]/30 text-[var(--color-success-400)]" 
                          : "bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-400)]"
                      )}
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
              
              <button 
                onClick={() => addSet(exIndex)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-3 text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Set
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={() => setIsExerciseModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm font-bold text-[var(--color-brand-400)] hover:bg-[var(--color-surface)] transition-colors"
        >
          <Plus className="h-5 w-5" /> Add Exercise
        </button>

        {!isMagicLogging ? (
          <button 
            onClick={() => setIsMagicLogging(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <Sparkles className="h-5 w-5 text-purple-400" /> Magic Log
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm animate-in slide-in-from-bottom-2">
            <div className="relative flex items-center">
              <input 
                autoFocus
                type="text" 
                placeholder="e.g. 3 sets of bench press 10 reps at 100kg" 
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 pr-12 text-sm focus:outline-none focus:border-purple-500 text-[var(--color-text-primary)]"
                value={magicText}
                onChange={(e) => setMagicText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitMagicLog()}
                disabled={isProcessingVoice}
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={isProcessingVoice}
                className={cn(
                  "absolute right-3 p-1.5 rounded-md transition-all",
                  isListening ? "bg-red-500/10 text-red-500 animate-pulse" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
                )}
                title={isListening ? "Stop listening" : "Speak"}
              >
                <Mic className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={submitMagicLog}
                disabled={!magicText.trim() || isProcessingVoice}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg bg-purple-500 text-white disabled:opacity-50 hover:brightness-110 transition-all"
              >
                {isProcessingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isProcessingVoice ? "Analyzing..." : "Log Magic Workout"}
              </button>
              <button 
                onClick={() => { setIsMagicLogging(false); setMagicText(""); }}
                disabled={isProcessingVoice}
                className="px-6 py-3 text-sm font-bold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <ExerciseSearchModal 
        isOpen={isExerciseModalOpen} 
        onClose={() => setIsExerciseModalOpen(false)} 
        onSelect={addExercise} 
      />
    </div>
  );
}
