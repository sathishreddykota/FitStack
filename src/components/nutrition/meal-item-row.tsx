"use client";

// ─────────────────────────────────────────────
// MealItemRow — single food item in a meal
// ─────────────────────────────────────────────

import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNutrition } from "@/hooks/use-nutrition";
import type { ServingUnit } from "@/types/nutrition.types";

interface MealItemRowProps {
  item: {
    id: string;
    food: { name: string; brand: string | null };
    quantityG: number;
    servingUnit: ServingUnit;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number | null;
  };
  onRefresh: () => void;
}

export function MealItemRow({ item, onRefresh }: MealItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantityG.toString());
  const { updateItem, deleteItem, isLoading } = useNutrition(onRefresh);

  const handleSave = async () => {
    const q = parseFloat(quantity);
    if (isNaN(q) || q < 1) return;
    const ok = await updateItem({
      itemId: item.id,
      quantityG: q,
      servingUnit: item.servingUnit,
    });
    if (ok) setEditing(false);
  };

  const handleDelete = () => deleteItem(item.id);

  return (
    <div
      onClick={() => !editing && setEditing(true)}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors cursor-pointer",
        "hover:bg-[var(--color-surface-2)]",
      )}
    >
      {/* Food info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {item.food.name}
        </p>
        {item.food.brand && (
          <p className="text-xs text-[var(--color-text-muted)] truncate">{item.food.brand}</p>
        )}
        {/* Macros */}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold" style={{ color: "var(--color-protein)" }}>
              P {Math.round(item.proteinG)}g
            </span>
          </span>
          <span className="text-[10px] text-[var(--color-text-disabled)]">·</span>
          <span className="text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold" style={{ color: "var(--color-carbs)" }}>
              C {Math.round(item.carbsG)}g
            </span>
          </span>
          <span className="text-[10px] text-[var(--color-text-disabled)]">·</span>
          <span className="text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold" style={{ color: "var(--color-fat)" }}>
              F {Math.round(item.fatG)}g
            </span>
          </span>
          {(item.fiberG ?? 0) > 0 && (
            <>
              <span className="text-[10px] text-[var(--color-text-disabled)]">·</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                <span className="font-semibold" style={{ color: "var(--color-fiber)" }}>
                  Fib {Math.round(item.fiberG!)}g
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quantity + calories */}
      <div className="flex-shrink-0 text-right">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-16 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-500)]"
              min={1}
              max={5000}
              autoFocus
            />
            <span className="text-xs text-[var(--color-text-muted)]">{item.servingUnit}</span>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="rounded-lg p-1 text-[var(--color-success-400)] hover:bg-[var(--color-surface-3)]"
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setEditing(false); setQuantity(item.quantityG.toString()); }}
              className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {Math.round(item.calories)} kcal
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {item.quantityG}{item.servingUnit}
              </p>
            </div>
            {/* Actions — always visible on mobile, hover on desktop */}
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
                title="Edit quantity"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isLoading}
                className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-error-400)]/10 hover:text-[var(--color-error-400)]"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
