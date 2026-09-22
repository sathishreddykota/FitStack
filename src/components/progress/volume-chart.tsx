"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface VolumeData {
  date: string;
  volume: number;
}

interface VolumeChartProps {
  data: VolumeData[];
}

export function VolumeChart({ data }: VolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No workout volume available</p>
        <p className="text-xs text-[var(--color-text-muted)] opacity-70">Log workouts to see your volume progression.</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
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
            formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volume"]}
          />
          <Bar 
            dataKey="volume" 
            fill="var(--color-highlight-500)" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
