import { BrainCircuit, Sparkles, User } from "lucide-react";

export function AiCoachPreview() {
  return (
    <section id="ai-coach" className="py-24 bg-surface-0">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-text-primary mb-6 flex items-center gap-3">
              <BrainCircuit className="h-8 w-8 text-purple-400" />
              Your data becomes your coach.
            </h2>
            <p className="text-lg text-text-secondary mb-8">
              Logging data is useless if you don&apos;t know what to do with it. FitStack&apos;s AI analyzes your food intake, weight trends, and workout performance to give you actionable advice.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-white/5 bg-surface-1 flex items-start gap-4">
                 <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                 </div>
                 <div>
                   <h4 className="font-semibold text-text-primary text-sm">Nutrition Adjustments</h4>
                   <p className="text-sm text-text-muted mt-1">Automatically suggests macro tweaks if your weight trend stalls for two weeks.</p>
                 </div>
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-surface-1 flex items-start gap-4">
                 <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                 </div>
                 <div>
                   <h4 className="font-semibold text-text-primary text-sm">Volume Management</h4>
                   <p className="text-sm text-text-muted mt-1">Notices when your strength dips and suggests a deload week.</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="bg-surface-1 border border-white/10 rounded-2xl overflow-hidden shadow-elevated">
              <div className="bg-surface-2 border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center">
                  <span className="text-xl">🏋️</span>
                </div>
                <div>
                  <div className="text-sm font-semibold">FitStack AI</div>
                  <div className="text-xs text-text-muted">Always analyzing...</div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                
                {/* User Message */}
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-surface-3 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-text-muted" />
                  </div>
                  <div className="bg-surface-3 rounded-2xl rounded-tl-none p-4 text-sm text-text-primary">
                    Why am I not gaining weight?
                  </div>
                </div>

                {/* AI Message */}
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <BrainCircuit className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl rounded-tl-none p-4 text-sm text-text-primary leading-relaxed shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <p className="mb-2">I checked your data from the last 14 days:</p>
                    <ul className="list-disc pl-4 space-y-1 text-purple-200 mb-3">
                      <li>Your average intake is <strong className="text-white">~250 kcal below</strong> your bulk target.</li>
                      <li>Protein is on track (avg 165g/day).</li>
                      <li>Your 7-day weight trend is flat (+0.05kg).</li>
                    </ul>
                    <p><strong>Recommendation:</strong> Consider increasing your daily intake by 200-300 kcal (mostly carbs) and continue monitoring your weekly average. I&apos;ve adjusted your targets for you.</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
