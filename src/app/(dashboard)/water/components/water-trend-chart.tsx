"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface WaterTrendChartProps {
  data: any[];
}

export function WaterTrendChart({ data }: WaterTrendChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            cursor={{ fill: 'var(--color-surface-2)', opacity: 0.4 }}
            contentStyle={{ 
              backgroundColor: "var(--color-background)", 
              borderColor: "var(--color-border)",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
            }}
            itemStyle={{ color: "var(--color-text-primary)" }}
            labelStyle={{ color: "var(--color-text-muted)", marginBottom: "0.25rem" }}
            formatter={(value: number) => [`${value} ml`, "Intake"]}
          />
          
          <ReferenceLine 
            y={data[0]?.target || 3000} 
            stroke="var(--color-info-400)" 
            strokeDasharray="4 4" 
            label={{ position: "insideTopLeft", value: "Target", fill: "var(--color-info-400)", fontSize: 11 }} 
          />

          <Bar 
            dataKey="amount" 
            radius={[4, 4, 0, 0]}
            fillOpacity={1}
            barSize={16}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.metTarget ? "var(--color-info-400)" : "var(--color-info-700)"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
