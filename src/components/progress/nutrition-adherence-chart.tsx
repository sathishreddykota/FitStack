"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface NutritionChartData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionAdherenceChartProps {
  data: NutritionChartData[];
  targetCalories?: number | null;
  targetProtein?: number | null;
  metric: "calories" | "protein";
}

export function NutritionAdherenceChart({ data, targetCalories, targetProtein, metric }: NutritionAdherenceChartProps) {
  const hasData = data.some(d => d.calories > 0 || d.protein > 0);

  if (!hasData) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No nutrition history available</p>
        <p className="text-xs text-[var(--color-text-muted)] opacity-70">Log meals to see nutrition analytics.</p>
      </div>
    );
  }

  const isCalories = metric === "calories";
  const dataKey = isCalories ? "calories" : "protein";
  const targetValue = isCalories ? targetCalories : targetProtein;
  const color = isCalories ? "var(--color-calories)" : "var(--color-protein)";
  const unit = isCalories ? "kcal" : "g";

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} 
            dy={10}
            minTickGap={20}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "var(--color-background)", 
              borderColor: "var(--color-border)",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
            }}
            itemStyle={{ color: "var(--color-text-primary)" }}
            labelStyle={{ color: "var(--color-text-muted)", marginBottom: "0.25rem" }}
            formatter={(value: number) => [`${value} ${unit}`, isCalories ? "Calories" : "Protein"]}
          />
          
          {targetValue && (
            <ReferenceLine 
              y={targetValue} 
              stroke={color} 
              strokeDasharray="4 4" 
              label={{ position: "insideTopLeft", value: "Target", fill: color, fontSize: 11 }} 
            />
          )}

          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#gradient-${dataKey})`}
            activeDot={{ r: 6, fill: color, stroke: "var(--color-background)", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
