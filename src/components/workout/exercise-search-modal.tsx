"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExerciseSearchModal({ isOpen, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const search = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/workout/exercises?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.exercises) setExercises(data.exercises);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-in slide-in-from-bottom-4 flex flex-col h-[80vh] max-h-[600px]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add Exercise</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[var(--color-background)]">
            <X className="h-5 w-5 text-[var(--color-text-muted)]" />
          </button>
        </div>
        
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand-500)]" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-[var(--color-text-muted)] text-sm">
              No exercises found.
            </div>
          ) : (
            <div className="space-y-1">
              {exercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => {
                    onSelect(ex);
                    onClose();
                  }}
                  className="flex w-full flex-col items-start rounded-xl p-3 hover:bg-[var(--color-background)] transition-colors text-left"
                >
                  <span className="font-bold text-[var(--color-text-primary)]">{ex.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)] mt-1">{ex.primaryMuscles.join(", ")} • {ex.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
