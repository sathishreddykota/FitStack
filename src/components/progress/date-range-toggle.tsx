"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/services/progress-service";

const RANGES: { value: DateRange; label: string }[] = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
  { value: "all", label: "ALL" },
];

export function DateRangeToggle() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentRange = searchParams.get("range") || "30";

  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams);
    if (range === "30") {
      params.delete("range");
    } else {
      params.set("range", range);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm">
      {RANGES.map((range) => {
        const isActive = currentRange === range.value.toString();
        return (
          <button
            key={range.value}
            onClick={() => handleRangeChange(range.value.toString())}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              isActive
                ? "bg-[var(--color-brand-500)] text-white shadow-sm"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
