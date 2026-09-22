"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface StrengthData {
  date: string;
  estimated1RM: number;
  maxWeight: number;
  repsForMaxWeight: number;
}

interface StrengthProgressionChartProps {
  data: StrengthData[];
}

export function StrengthProgressionChart({ data }: StrengthProgressionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No strength history available</p>
        <p className="text-xs text-[var(--color-text-muted)] opacity-70">Log this exercise in a workout to see progression.</p>
      </div>
    );
  }

  // Calculate domain padding
  const allValues = data.flatMap(d => [d.estimated1RM, d.maxWeight]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) * 0.2 || 5;
  const yMin = Math.max(0, Math.floor(minVal - padding));
  const yMax = Math.ceil(maxVal + padding);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            formatter={(value: number, name: string, props: any) => {
              if (name === "estimated1RM") return [`${value} kg`, "Est. 1RM"];
              if (name === "maxWeight") return [`${value} kg × ${props.payload.repsForMaxWeight}`, "Best Set"];
              return [value, name];
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-sm font-medium text-[var(--color-text-muted)]">{value === 'estimated1RM' ? 'Estimated 1RM' : 'Best Set Weight'}</span>}
          />
          
          <Line
            type="monotone"
            dataKey="estimated1RM"
            stroke="var(--color-brand-500)"
            strokeWidth={3}
            dot={{ r: 3, fill: "var(--color-brand-500)" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="maxWeight"
            stroke="var(--color-highlight-500)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: "var(--color-highlight-500)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
