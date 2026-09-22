export function HybridTraining() {
  const schedule = [
    { day: "MON", title: "Upper Strength", type: "strength" },
    { day: "TUE", title: "Lower Strength", type: "strength" },
    { day: "WED", title: "Conditioning", type: "conditioning" },
    { day: "THU", title: "Upper Hypertrophy", type: "hypertrophy" },
    { day: "FRI", title: "Lower Hypertrophy", type: "hypertrophy" },
    { day: "SAT", title: "Active Recovery", type: "recovery" },
    { day: "SUN", title: "Rest", type: "rest" },
  ];

  return (
    <section id="training" className="py-24 bg-surface-1">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-text-primary mb-6">
              More than muscle.<br />More than strength.
            </h2>
            <p className="text-lg text-text-secondary mb-8">
              True athleticism requires a balance of raw strength, muscular endurance, and cardiovascular health. FitStack allows you to build training blocks that incorporate all three seamlessly.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 h-6 w-6 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-brand-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Hypertrophy</h4>
                  <p className="text-sm text-text-muted">Build the foundation and aesthetic.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 h-6 w-6 rounded-full bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-accent-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Strength</h4>
                  <p className="text-sm text-text-muted">Increase force production on key lifts.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 h-6 w-6 rounded-full bg-highlight-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-highlight-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Conditioning</h4>
                  <p className="text-sm text-text-muted">Perform better and recover faster.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Schedule */}
          <div className="bg-surface-0 border border-white/5 rounded-2xl p-6 shadow-elevated">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-6">Example Hybrid Split</h4>
            <div className="space-y-3">
              {schedule.map((item, idx) => (
                <div key={idx} className="flex items-center p-3 rounded-lg bg-surface-1 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-12 text-xs font-bold text-text-muted">{item.day}</div>
                  <div className="flex-1 font-medium text-text-primary">{item.title}</div>
                  <div className="flex items-center">
                    {item.type === "strength" && <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-accent-500/10 text-accent-400 border border-accent-500/20">Strength</span>}
                    {item.type === "hypertrophy" && <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">Hypertrophy</span>}
                    {item.type === "conditioning" && <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-highlight-500/10 text-highlight-400 border border-highlight-500/20">Conditioning</span>}
                    {item.type === "recovery" && <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-success-500/10 text-success-400 border border-success-500/20">Recovery</span>}
                    {item.type === "rest" && <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-surface-3 text-text-muted border border-white/5">Rest</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
