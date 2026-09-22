"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Flame, Dumbbell } from "lucide-react";

interface DashboardChartsProps {
  nutritionData: any[];
  workoutData: any[];
  calorieTarget: number | null;
}

const CustomNutritionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl shadow-xl backdrop-blur-md">
        <p className="font-semibold text-[var(--color-text-primary)] mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[var(--color-text-muted)] text-sm flex items-center gap-1">
              <Flame className="w-3 h-3 text-[var(--color-calories)]" /> Calories
            </span>
            <span className="font-bold text-[var(--color-calories)]">{data.calories} kcal</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[var(--color-text-muted)] text-sm">Protein</span>
            <span className="font-bold text-[var(--color-protein)]">{data.protein}g</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[var(--color-text-muted)] text-sm">Carbs</span>
            <span className="font-bold text-[var(--color-carbs)]">{data.carbs}g</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[var(--color-text-muted)] text-sm">Fat</span>
            <span className="font-bold text-[var(--color-fat)]">{data.fat}g</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomWorkoutTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-xl shadow-xl backdrop-blur-md">
        <p className="font-semibold text-[var(--color-text-primary)] mb-2">{label}</p>
        <div className="flex justify-between items-center gap-4">
          <span className="text-[var(--color-text-muted)] text-sm flex items-center gap-1">
            <Dumbbell className="w-3 h-3 text-[var(--color-highlight-400)]" /> Volume
          </span>
          <span className="font-bold text-[var(--color-highlight-400)]">{data.volume.toLocaleString()} kg</span>
        </div>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({ nutritionData, workoutData, calorieTarget }: DashboardChartsProps) {
  // If no workout data at all, we might want to generate dummy dates or just show empty state
  const hasWorkoutData = workoutData && workoutData.length > 0;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 animate-fade-in">
      
      {/* Nutrition Chart */}
      <section aria-labelledby="nutrition-chart-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="nutrition-chart-heading"
            className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            7-Day Calories
          </h2>
        </div>
        <div className="h-[300px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 shadow-sm relative overflow-hidden group">
          {/* Subtle gradient glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-[var(--color-brand-500)]/5 blur-3xl group-hover:bg-[var(--color-brand-500)]/10 transition-all"></div>
          
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nutritionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-3)" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: 'var(--color-surface-2)' }} content={<CustomNutritionTooltip />} />
              
              {/* Optional: Add a reference line for calorie target */}
              {calorieTarget && (
                 <line 
                   x1="0" 
                   y1={calorieTarget} 
                   x2="100%" 
                   y2={calorieTarget} 
                   stroke="var(--color-brand-500)" 
                   strokeDasharray="4 4" 
                   opacity={0.5} 
                 />
              )}
              
              <Bar 
                dataKey="calories" 
                fill="var(--color-brand-500)" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Workout Chart */}
      <section aria-labelledby="workout-chart-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="workout-chart-heading"
            className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            Training Volume
          </h2>
        </div>
        <div className="h-[300px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-[var(--color-highlight-500)]/5 blur-3xl group-hover:bg-[var(--color-highlight-500)]/10 transition-all"></div>
          
          {hasWorkoutData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={workoutData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-highlight-500)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-highlight-500)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-3)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                />
                <Tooltip content={<CustomWorkoutTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="var(--color-highlight-400)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-[var(--color-text-muted)]">
              <Dumbbell className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Log a workout to see volume trends</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
