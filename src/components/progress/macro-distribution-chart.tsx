"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

interface MacroDistributionChartProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function MacroDistributionChart({ proteinG, carbsG, fatG }: MacroDistributionChartProps) {
  // If no data, show empty state
  if (proteinG === 0 && carbsG === 0 && fatG === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No macro data</p>
        <p className="text-xs text-[var(--color-text-muted)] opacity-70">Log your nutrition to see your breakdown.</p>
      </div>
    );
  }

  // Calculate calories to get correct percentages (P: 4, C: 4, F: 9)
  const proteinCals = proteinG * 4;
  const carbsCals = carbsG * 4;
  const fatCals = fatG * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  const data = [
    { name: "Protein", value: proteinCals, grams: proteinG, color: "var(--color-protein)" },
    { name: "Carbs", value: carbsCals, grams: carbsG, color: "var(--color-carbs)" },
    { name: "Fat", value: fatCals, grams: fatG, color: "var(--color-fat)" },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalCals) * 100).toFixed(1);
      
      return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-elevated)]">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
            {data.name}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold" style={{ color: data.color }}>
              {Math.round(data.grams)}g
            </span>
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              ({percentage}%)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
          Total Avg
        </span>
        <span className="text-2xl font-bold text-[var(--color-text-primary)]">
          {Math.round(totalCals)}
        </span>
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          kcal
        </span>
      </div>
    </div>
  );
}
