import { TrendingUp, Scale, Activity } from "lucide-react";

export function ProgressShowcase() {
  return (
    <section id="progress" className="py-24 bg-surface-1">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-text-primary mb-4">
          Don&apos;t just train. Measure progress.
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-text-secondary mb-16">
          What gets measured gets managed. FitStack visualizes your data so you know exactly what is working.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Weight Trend Card */}
          <div className="bg-surface-0 border border-white/5 rounded-2xl p-6 shadow-card flex flex-col text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <Scale className="h-5 w-5 text-brand-400" />
                Weight Trend
              </div>
              <span className="text-xs font-semibold text-success-400 bg-success-500/10 px-2 py-1 rounded">On track</span>
            </div>
            
            <div className="text-3xl font-extrabold mb-1">78.4 kg</div>
            <p className="text-xs text-text-muted mb-6">7-day moving average</p>
            
            {/* Mock Chart line */}
            <div className="mt-auto h-24 flex items-end gap-1 w-full opacity-80">
              {[40, 45, 55, 48, 60, 65, 75, 70, 80, 85, 95, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-brand-500 rounded-t-sm" style={{ height: `${h}%`, opacity: (i+1)/12 }} />
              ))}
            </div>
            <p className="text-sm text-text-secondary mt-4 border-t border-white/5 pt-4">
              Your average weekly weight is trending upward by +0.3kg.
            </p>
          </div>

          {/* Strength Progression Card */}
          <div className="bg-surface-0 border border-white/5 rounded-2xl p-6 shadow-card flex flex-col text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <TrendingUp className="h-5 w-5 text-accent-400" />
                Bench Press 1RM
              </div>
              <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2 py-1 rounded">New PR!</span>
            </div>
            
            <div className="text-3xl font-extrabold mb-1">105 kg</div>
            <p className="text-xs text-text-muted mb-6">Estimated 1-Rep Max</p>
            
            {/* Mock Chart steps */}
            <div className="mt-auto h-24 flex flex-col justify-end w-full relative">
               <svg viewBox="0 0 100 50" className="w-full h-full preserve-3d overflow-visible" stroke="currentColor">
                 <path d="M 0 45 L 20 40 L 40 40 L 60 25 L 80 20 L 100 5" fill="none" strokeWidth="3" className="text-accent-500 shadow-glow-accent" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <p className="text-sm text-text-secondary mt-4 border-t border-white/5 pt-4">
              Your bench press increased 7.5 kg over the last 6 weeks.
            </p>
          </div>

          {/* Workout Consistency Card */}
          <div className="bg-surface-0 border border-white/5 rounded-2xl p-6 shadow-card flex flex-col text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-text-primary font-medium">
                <Activity className="h-5 w-5 text-highlight-500" />
                Consistency
              </div>
            </div>
            
            <div className="text-3xl font-extrabold mb-1">92%</div>
            <p className="text-xs text-text-muted mb-6">Workouts completed this month</p>
            
            {/* Mock heatmap — static pattern avoids Math.random() purity issue */}
            <div className="mt-auto grid grid-cols-7 gap-1">
              {[...Array(28)].map((_, i) => {
                // Static deterministic pattern (no Math.random in render)
                const isActive = [1,2,3,5,6,8,9,10,12,13,15,16,17,19,20,22,23,24,26,27].includes(i);
                return (
                  <div 
                    key={i} 
                    className={`aspect-square rounded-sm ${isActive ? 'bg-highlight-500/80 shadow-[0_0_8px_rgba(250,204,21,0.4)]' : 'bg-surface-2'}`} 
                  />
                )
              })}
            </div>
            <p className="text-sm text-text-secondary mt-4 border-t border-white/5 pt-4">
              You&apos;ve hit 4 workouts per week for the last 3 weeks.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
