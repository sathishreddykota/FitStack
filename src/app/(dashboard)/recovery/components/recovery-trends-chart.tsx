"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RecoveryTrendsChartProps {
  data: any[];
}

export function RecoveryTrendsChart({ data }: RecoveryTrendsChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-brand-400)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--color-brand-400)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent-400)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--color-accent-400)" stopOpacity={0}/>
            </linearGradient>
          </defs>
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
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} 
            domain={[0, 12]}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={false} 
            domain={[0, 5]}
          />
          <Tooltip 
            cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: "4 4", fill: 'transparent' }}
            contentStyle={{ 
              backgroundColor: "var(--color-background)", 
              borderColor: "var(--color-border)",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
            }}
            itemStyle={{ color: "var(--color-text-primary)" }}
            labelStyle={{ color: "var(--color-text-muted)", marginBottom: "0.25rem" }}
          />
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="sleepDuration" 
            name="Sleep (hrs)"
            stroke="var(--color-brand-400)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorSleep)" 
            activeDot={{ r: 6, fill: "var(--color-brand-400)", strokeWidth: 0 }}
          />
          <Area 
            yAxisId="right"
            type="monotone" 
            dataKey="energy" 
            name="Energy (1-5)"
            stroke="var(--color-accent-400)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorEnergy)" 
            activeDot={{ r: 6, fill: "var(--color-accent-400)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
