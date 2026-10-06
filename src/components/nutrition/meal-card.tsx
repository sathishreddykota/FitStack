"use client";

// ─────────────────────────────────────────────
// MealCard — collapsible card for one meal type
// ─────────────────────────────────────────────

import { useState, useRef } from "react";
import { ChevronDown, Plus, Heart, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MealItemRow } from "./meal-item-row";
import { FoodSearchModal } from "./food-search-modal";
import type { MealType, ServingUnit } from "@/types/nutrition.types";

const MEAL_TYPE_CONFIG: Record<
  MealType,
  { label: string; emoji: string; gradient: string }
> = {
  BREAKFAST: {
    label: "Breakfast",
    emoji: "🌅",
    gradient: "from-[var(--color-warning-400)]/20 to-transparent",
  },
  LUNCH: {
    label: "Lunch",
    emoji: "☀️",
    gradient: "from-[var(--color-carbs)]/20 to-transparent",
  },
  DINNER: {
    label: "Dinner",
    emoji: "🌙",
    gradient: "from-[var(--color-brand-400)]/20 to-transparent",
  },
  SNACK: {
    label: "Snack",
    emoji: "🍎",
    gradient: "from-[var(--color-accent-400)]/20 to-transparent",
  },
  PRE_WORKOUT: {
    label: "Pre-Workout",
    emoji: "⚡",
    gradient: "from-[var(--color-highlight-400)]/20 to-transparent",
  },
  POST_WORKOUT: {
    label: "Post-Workout",
    emoji: "💪",
    gradient: "from-[var(--color-protein)]/20 to-transparent",
  },
};

interface MealItemData {
  id: string;
  foodId: string;
  food: { name: string; brand: string | null };
  quantityG: number;
  servingUnit: ServingUnit;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
}

interface MealCardProps {
  mealType: MealType;
  date: string; // YYYY-MM-DD
  items: MealItemData[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  defaultOpen?: boolean;
  onRefresh: () => void;
}

export function MealCard({
  mealType,
  date,
  items,
  totalCalories,
  totalProteinG,
  totalCarbsG,
  totalFatG,
  totalFiberG,
  defaultOpen = false,
  onRefresh,
}: MealCardProps) {
  const [expanded, setExpanded] = useState(defaultOpen || items.length > 0);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mealName, setMealName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isMagicLogging, setIsMagicLogging] = useState(false);
  const [magicText, setMagicText] = useState("");
  
  const config = MEAL_TYPE_CONFIG[mealType];
  const hasItems = items.length > 0;

  const handleSaveMeal = async () => {
    if (!mealName.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/nutrition/saved-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mealName.trim(),
          items: items.map((item) => ({
            foodId: item.foodId,
            quantityG: item.quantityG,
            servingUnit: item.servingUnit,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save meal");
      toast.success("Meal saved to My Meals!");
      setIsSaving(false);
      setMealName("");
    } catch (error) {
      toast.error("Failed to save meal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitMagicLog = async () => {
    if (!magicText.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/nutrition/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: magicText, mealType, date }),
      });
      if (!res.ok) throw new Error("Failed to parse magic log");
      toast.success("Magic Log success!");
      setMagicText("");
      setIsMagicLogging(false);
      onRefresh();
    } catch {
      toast.error("Could not parse that food. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-3xl border-none bg-[var(--color-surface-1)] shadow-card overflow-hidden transition-shadow duration-300 hover:shadow-elevated">
        {/* Header */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center gap-4 px-6 py-5 transition-colors hover:bg-[var(--color-surface-2)]"
        >
          {/* Avatar circle for meal icon */}
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--color-surface-2)] to-[var(--color-surface-3)] shadow-sm text-2xl border border-[var(--color-border-subtle)]">
            {config.emoji}
          </div>
          
          <div className="flex-1 text-left">
            <span className="text-base font-bold text-[var(--color-text-primary)]">
              {config.label}
            </span>
            {hasItems && (
              <div className="text-xs font-semibold text-[var(--color-brand-500)] mt-0.5">
                {Math.round(totalCalories)} <span className="text-[var(--color-text-muted)] font-medium">kcal</span>
              </div>
            )}
          </div>

          {/* Macro pills — show when collapsed */}
          {hasItems && !expanded && (
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex gap-2 text-xs font-medium">
                <span style={{ color: "var(--color-protein)" }}>{Math.round(totalProteinG)}g P</span>
                <span className="text-[var(--color-border)]">•</span>
                <span style={{ color: "var(--color-carbs)" }}>{Math.round(totalCarbsG)}g C</span>
                <span className="text-[var(--color-border)]">•</span>
                <span style={{ color: "var(--color-fat)" }}>{Math.round(totalFatG)}g F</span>
                {totalFiberG > 0 && (
                  <>
                    <span className="text-[var(--color-border)]">•</span>
                    <span style={{ color: "var(--color-fiber)" }}>{Math.round(totalFiberG)}g Fib</span>
                  </>
                )}
              </div>
              <div className="flex h-1.5 w-24 rounded-full overflow-hidden bg-[var(--color-surface-3)] ml-2">
                <div 
                  style={{ 
                    width: `${totalCalories > 0 ? ((totalProteinG * 4) / totalCalories) * 100 : 0}%`, 
                    backgroundColor: "var(--color-protein)" 
                  }} 
                />
                <div 
                  style={{ 
                    width: `${totalCalories > 0 ? ((totalCarbsG * 4) / totalCalories) * 100 : 0}%`, 
                    backgroundColor: "var(--color-carbs)" 
                  }} 
                />
                <div 
                  style={{ 
                    width: `${totalCalories > 0 ? ((totalFatG * 9) / totalCalories) * 100 : 0}%`, 
                    backgroundColor: "var(--color-fat)" 
                  }} 
                />
              </div>
            </div>
          )}

          {!hasItems && (
            <span className="text-xs text-[var(--color-text-disabled)]">Empty</span>
          )}

          <ChevronDown
            className={cn(
              "h-5 w-5 text-[var(--color-text-muted)] transition-transform duration-300 ease-spring",
              expanded ? "rotate-180" : "",
            )}
          />
        </button>

        {/* Items */}
        {expanded && (
          <div className="border-t border-[var(--color-border-subtle)] bg-white/50">
            {hasItems ? (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {items.map((item) => (
                  <MealItemRow key={item.id} item={item} onRefresh={onRefresh} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm font-medium text-[var(--color-text-disabled)] italic">
                No foods logged yet
              </div>
            )}

            {/* Action buttons */}
            <div className="px-6 py-4 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row gap-3">
              {!isSaving && (
                <div className="flex w-full flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setModalOpen(true)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold shadow-sm",
                      "bg-[var(--color-brand-500)] text-white",
                      "hover:bg-[var(--color-brand-400)] transition-all duration-200 hover:-translate-y-0.5",
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    Add Food
                  </button>
                  
                  <button
                    onClick={() => setIsMagicLogging(true)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold shadow-sm",
                      "bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-500)] transition-all",
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    Magic Log
                  </button>
                  
                  <div className="flex gap-3 sm:flex-none">
                    {hasItems && (
                      <button
                        onClick={() => setIsSaving(true)}
                        className={cn(
                          "flex-none px-4 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold shadow-sm",
                          "bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] hover:text-red-500",
                          "hover:bg-[var(--color-surface-2)] transition-all hover:-translate-y-0.5"
                        )}
                        title="Save as Meal"
                      >
                        <Heart className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {isMagicLogging && (
                <div className="flex w-full gap-3 items-center animate-slide-up">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="e.g. 2 eggs and a slice of toast" 
                    className="flex-1 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-brand-500)] shadow-sm"
                    value={magicText}
                    onChange={(e) => setMagicText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitMagicLog()}
                  />
                  <button 
                    onClick={submitMagicLog}
                    disabled={!magicText.trim() || isSubmitting}
                    className="px-6 py-3 text-sm font-bold rounded-2xl bg-[var(--color-brand-500)] text-white disabled:opacity-50 shadow-sm flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => { setIsMagicLogging(false); setMagicText(""); }}
                    disabled={isSubmitting}
                    className="px-6 py-3 text-sm font-bold rounded-2xl bg-white border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              {isSaving && (
                <div className="flex w-full gap-3 items-center animate-slide-up">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Meal Name (e.g., Morning Oats)" 
                    className="flex-1 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-brand-500)] shadow-sm"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveMeal()}
                  />
                  <button 
                    onClick={handleSaveMeal}
                    disabled={!mealName.trim() || isSubmitting}
                    className="px-6 py-3 text-sm font-bold rounded-2xl bg-[var(--color-brand-500)] text-white disabled:opacity-50 shadow-sm"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                  <button 
                    onClick={() => { setIsSaving(false); setMealName(""); }}
                    disabled={isSubmitting}
                    className="px-6 py-3 text-sm font-bold rounded-2xl bg-white border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <FoodSearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mealType={mealType}
        date={date}
        onSuccess={() => {
          setModalOpen(false);
          onRefresh();
        }}
      />
    </>
  );
}
