"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

interface WeightLogData {
  date: Date;
  weightKg: number;
}

interface WeightTrendChartProps {
  data: WeightLogData[];
  targetWeight?: number | null;
  startingWeight?: number | null;
}

export function WeightTrendChart({ data, targetWeight, startingWeight }: WeightTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No weight history available</p>
        <p className="text-xs text-[var(--color-text-muted)] opacity-70">Log your weight to see your trend.</p>
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map((log) => ({
    date: format(new Date(log.date), "MMM dd"),
    weight: log.weightKg,
  }));

  // Calculate domain for Y axis to make chart look good
  const allWeights = data.map((d) => d.weightKg);
  if (targetWeight) allWeights.push(targetWeight);
  if (startingWeight) allWeights.push(startingWeight);
  
  const minWeight = Math.min(...allWeights);
  const maxWeight = Math.max(...allWeights);
  
  // Add some padding to domain
  const padding = (maxWeight - minWeight) * 0.2 || 5; 
  const yMin = Math.max(0, Math.floor(minWeight - padding));
  const yMax = Math.ceil(maxWeight + padding);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} 
            dy={10}
            minTickGap={30}
          />
          <YAxis 
            domain={[yMin, yMax]} 
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
          />
          
          {targetWeight && (
            <ReferenceLine 
              y={targetWeight} 
              stroke="var(--color-accent-500)" 
              strokeDasharray="3 3" 
              label={{ position: "insideTopLeft", value: "Target", fill: "var(--color-text-muted)", fontSize: 11 }} 
            />
          )}

          <Line
            type="monotone"
            dataKey="weight"
            name="Weight (kg)"
            stroke="var(--color-brand-500)"
            strokeWidth={3}
            dot={{ r: 4, fill: "var(--color-background)", stroke: "var(--color-brand-500)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "var(--color-brand-500)", stroke: "var(--color-background)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
