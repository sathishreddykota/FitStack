"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Scale, TrendingUp, Flame, Beef, Target, Trophy, Dumbbell, Activity, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DateRangeToggle } from "@/components/progress/date-range-toggle";
import { WeightTrendChart } from "@/components/progress/weight-trend-chart";
import { NutritionAdherenceChart } from "@/components/progress/nutrition-adherence-chart";
import { VolumeChart } from "@/components/progress/volume-chart";
import { StrengthProgressionChart } from "@/components/progress/strength-progression-chart";
import { MacroDistributionChart } from "@/components/progress/macro-distribution-chart";
import { LogWeightModal } from "@/components/progress/log-weight-modal";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatRelativeDate } from "@/lib/utils";

interface ProgressClientProps {
  range: 7 | 30 | 90 | "all";
  weightData: {
    logs: { date: Date; weightKg: number }[];
    currentWeight: number | null;
    startingWeight: number | null;
    targetWeight: number | null;
    goalProgress: number;
  };
  nutritionData: {
    chartData: any[];
    averages: { calories: number; protein: number; carbs: number; fat: number };
    targets: any;
    daysTracked: number;
    adherence: { calories: number; protein: number };
  };
  workoutData: {
    totalWorkouts: number;
    totalSets: number;
    totalReps: number;
    totalVolume: number;
    chartData: any[];
    recentSessions: any[];
  };
  strengthData: {
    chartData: any[];
    allTimeMax1RM: number;
    allTimeMaxWeight: number;
  };
  recentPRs: any[];
  availableExercises: { id: string; name: string }[];
  selectedExerciseId: string;
}

export function ProgressClient({
  range,
  weightData,
  nutritionData,
  workoutData,
  strengthData,
  recentPRs,
  availableExercises,
  selectedExerciseId,
}: ProgressClientProps) {
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleExerciseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams);
    params.set("exerciseId", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const weightChange = weightData.currentWeight && weightData.startingWeight 
    ? weightData.currentWeight - weightData.startingWeight 
    : 0;
  
  const isLosing = weightChange < 0;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ── Header & Controls ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Progress & Analytics</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Track your fitness journey over time.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <DateRangeToggle />
          <button
            onClick={() => setIsWeightModalOpen(true)}
            className="flex items-center gap-2 rounded-xl brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow-brand)] hover:brightness-110 transition-all"
          >
            <Scale className="h-4 w-4" />
            Log Weight
          </button>
        </div>
      </div>

      {/* ── Summary Strip ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] mb-1">
            <Scale className="h-4 w-4 text-[var(--color-brand-400)]" />
            Weight Change
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]">
              {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
            </span>
            {weightChange !== 0 && (
              <span className={`flex items-center text-xs font-semibold ${isLosing ? 'text-[var(--color-success-400)]' : 'text-[var(--color-warning-400)]'}`}>
                {isLosing ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] mb-1">
            <Flame className="h-4 w-4 text-[var(--color-calories)]" />
            Avg Calories
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {nutritionData.averages.calories > 0 ? nutritionData.averages.calories : "—"}
            <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">kcal</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] mb-1">
            <Dumbbell className="h-4 w-4 text-[var(--color-highlight-400)]" />
            Workouts
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {workoutData.totalWorkouts}
            <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">completed</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] mb-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Volume
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {workoutData.totalVolume > 0 ? (workoutData.totalVolume / 1000).toFixed(1) : "—"}
            <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">k kg</span>
          </p>
        </div>
      </div>

      {/* ── Bodyweight & Goals ──────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <Target className="h-5 w-5 text-[var(--color-accent-400)]" /> Bodyweight & Goals
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Goal Progress</h3>
              <div className="relative flex justify-center mb-6">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="var(--color-border)" strokeWidth="12" fill="none" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    stroke="var(--color-brand-500)" 
                    strokeWidth="12" fill="none" 
                    strokeDasharray="351.858" 
                    strokeDashoffset={351.858 - (351.858 * weightData.goalProgress) / 100} 
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-[var(--color-text-primary)]">{Math.round(weightData.goalProgress)}%</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Starting</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{weightData.startingWeight ?? "—"} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Current</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{weightData.currentWeight ?? "—"} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Target</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{weightData.targetWeight ?? "—"} kg</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Weight Trend</h3>
            <WeightTrendChart 
              data={weightData.logs} 
              targetWeight={weightData.targetWeight} 
              startingWeight={weightData.startingWeight} 
            />
          </div>
        </div>
      </section>

      {/* ── Nutrition Analytics ─────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <Beef className="h-5 w-5 text-[var(--color-protein)]" /> Nutrition Consistency
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Calorie Adherence"
            value={`${Math.round(nutritionData.adherence.calories)}%`}
            icon={Activity}
            iconColor="var(--color-calories)"
            progress={nutritionData.adherence.calories}
            progressColor="var(--color-calories)"
            subtext={`+/- 10% of target`}
          />
          <StatCard
            label="Protein Consistency"
            value={`${Math.round(nutritionData.adherence.protein)}%`}
            icon={Beef}
            iconColor="var(--color-protein)"
            progress={nutritionData.adherence.protein}
            progressColor="var(--color-protein)"
            subtext={`Met target`}
          />
          <StatCard
            label="Avg Carbs"
            value={`${nutritionData.averages.carbs}g`}
            icon={Flame}
            iconColor="var(--color-carbs)"
            subtext={nutritionData.targets?.dailyCarbsTargetG ? `Target: ${nutritionData.targets.dailyCarbsTargetG}g` : undefined}
          />
          <StatCard
            label="Avg Fat"
            value={`${nutritionData.averages.fat}g`}
            icon={Flame}
            iconColor="var(--color-fat)"
            subtext={nutritionData.targets?.dailyFatTargetG ? `Target: ${nutritionData.targets.dailyFatTargetG}g` : undefined}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Calorie Intake</h3>
            <NutritionAdherenceChart 
              data={nutritionData.chartData} 
              targetCalories={nutritionData.targets?.dailyCalorieTarget} 
              metric="calories" 
            />
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Protein Intake</h3>
            <NutritionAdherenceChart 
              data={nutritionData.chartData} 
              targetProtein={nutritionData.targets?.dailyProteinTargetG} 
              metric="protein" 
            />
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Macro Split</h3>
            <MacroDistributionChart 
              proteinG={nutritionData.averages.protein}
              carbsG={nutritionData.averages.carbs}
              fatG={nutritionData.averages.fat}
            />
          </div>
        </div>
      </section>

      {/* ── Workout Analytics ───────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-[var(--color-highlight-400)]" /> Training & Volume
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Volume Load (kg)</h3>
            <VolumeChart data={workoutData.chartData} />
          </div>
          <div className="lg:col-span-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">Training Stats</h3>
            <div className="space-y-6">
               <div>
                  <p className="text-[var(--color-text-muted)] text-sm mb-1">Total Sets</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">{workoutData.totalSets}</p>
               </div>
               <div>
                  <p className="text-[var(--color-text-muted)] text-sm mb-1">Total Reps</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">{workoutData.totalReps.toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-[var(--color-text-muted)] text-sm mb-2">Recent Sessions</p>
                  {workoutData.recentSessions.length > 0 ? (
                    <div className="space-y-2">
                      {workoutData.recentSessions.map((session) => (
                        <div key={session.id as string} className="flex justify-between items-center bg-[var(--color-background)] rounded-lg p-2 text-sm border border-[var(--color-border)]">
                           <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[120px]">{session.name as string}</span>
                           <span className="text-xs text-[var(--color-text-muted)]">{formatRelativeDate(new Date(session.date as Date))}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)] italic">No recent sessions</p>
                  )}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Strength Progression ────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[var(--color-success-400)]" /> Strength Progression & PRs
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
               <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Historical Performance</h3>
               <select 
                  value={selectedExerciseId} 
                  onChange={handleExerciseChange}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)]"
               >
                  <option value="" disabled>Select an exercise...</option>
                  {availableExercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
               </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl p-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Max Estimated 1RM</p>
                  <p className="text-lg font-bold text-[var(--color-brand-400)]">
                    {strengthData.allTimeMax1RM > 0 ? `${strengthData.allTimeMax1RM} kg` : "—"}
                  </p>
               </div>
               <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl p-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Max Weight Lifted</p>
                  <p className="text-lg font-bold text-[var(--color-highlight-400)]">
                    {strengthData.allTimeMaxWeight > 0 ? `${strengthData.allTimeMaxWeight} kg` : "—"}
                  </p>
               </div>
            </div>

            <div className="flex-1 min-h-[250px]">
               <StrengthProgressionChart data={strengthData.chartData} />
            </div>
          </div>

          <div className="lg:col-span-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm flex flex-col h-full max-h-[500px]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-6 flex items-center gap-2">
               <Trophy className="h-4 w-4 text-yellow-500" /> Recent Personal Records
            </h3>
            <div className="overflow-y-auto pr-2 space-y-3 flex-1">
               {recentPRs.length > 0 ? (
                 recentPRs.map((pr) => (
                   <div key={pr.id as string} className="flex flex-col gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                     <div className="flex justify-between items-start">
                        <span className="font-semibold text-[var(--color-text-primary)] text-sm">{pr.exerciseName as string}</span>
                        <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatRelativeDate(new Date(pr.date as Date))}
                        </span>
                     </div>
                     <p className="text-sm text-[var(--color-highlight-400)] font-medium">
                        {pr.weightKg} kg × {pr.reps} reps
                     </p>
                     {pr.estimated1RM && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Est. 1RM: {pr.estimated1RM} kg
                        </p>
                     )}
                   </div>
                 ))
               ) : (
                 <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Trophy className="h-8 w-8 text-[var(--color-text-muted)] opacity-50 mb-2" />
                    <p className="text-sm text-[var(--color-text-muted)]">Keep training.</p>
                    <p className="text-xs text-[var(--color-text-muted)] opacity-70">Your personal records will appear here.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </section>

      <LogWeightModal 
        isOpen={isWeightModalOpen} 
        onClose={() => setIsWeightModalOpen(false)} 
        currentWeight={weightData.currentWeight} 
      />
    </div>
  );
}
