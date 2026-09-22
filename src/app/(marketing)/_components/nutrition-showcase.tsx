import { Utensils, Coffee, Pizza } from "lucide-react";

export function NutritionShowcase() {
  return (
    <section id="nutrition" className="py-24 bg-surface-0 overflow-hidden relative">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-brand-500/20 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Mock Dashboard */}
          <div className="order-2 lg:order-1 relative">
            <div className="bg-surface-1 border border-white/10 rounded-2xl p-6 shadow-elevated relative z-10">
              
              {/* Macros Overview */}
              <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Calories</h3>
                    <div className="text-3xl font-extrabold mt-1">2,140 <span className="text-lg font-normal text-text-muted">/ 2,900</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-calories font-medium">760 remaining</div>
                  </div>
                </div>
                <div className="progress-track h-3 bg-surface-3">
                  <div className="bg-calories h-full rounded-full w-[74%]" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-text-muted">
                    <span>Protein</span>
                    <span>104/180g</span>
                  </div>
                  <div className="progress-track bg-surface-3">
                    <div className="bg-protein h-full rounded-full w-[58%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-text-muted">
                    <span>Carbs</span>
                    <span>280/350g</span>
                  </div>
                  <div className="progress-track bg-surface-3">
                    <div className="bg-carbs h-full rounded-full w-[80%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-text-muted">
                    <span>Fat</span>
                    <span>61/78g</span>
                  </div>
                  <div className="progress-track bg-surface-3">
                    <div className="bg-fat h-full rounded-full w-[78%]" />
                  </div>
                </div>
              </div>

              {/* Meals */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-text-primary">Today&apos;s Meals</h4>
                
                <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-2 border border-white/5">
                  <div className="h-10 w-10 rounded-lg bg-surface-3 flex items-center justify-center">
                    <Coffee className="h-5 w-5 text-text-muted" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Breakfast</div>
                    <div className="text-xs text-text-muted">Oats, Whey Protein, Banana</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">540 kcal</div>
                    <div className="text-xs text-protein font-medium">45g P</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-2 border border-white/5">
                  <div className="h-10 w-10 rounded-lg bg-surface-3 flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-text-muted" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Lunch</div>
                    <div className="text-xs text-text-muted">Chicken Breast, White Rice, Broccoli</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">820 kcal</div>
                    <div className="text-xs text-protein font-medium">55g P</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-2 border border-brand-500/30 border-dashed relative">
                  <div className="absolute inset-0 bg-brand-500/5 rounded-xl pointer-events-none" />
                  <div className="h-10 w-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                    <Pizza className="h-5 w-5 text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-brand-300">Add Dinner</div>
                  </div>
                </div>

              </div>

            </div>
            
            {/* Decorative element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent-500/20 rounded-full blur-2xl -z-10 pointer-events-none" />
          </div>

          {/* Text Content */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-text-primary mb-6">
              Know what you&apos;re eating.
            </h2>
            <p className="text-lg text-text-secondary mb-6">
              Achieving an aesthetic physique requires precision. Track your meals with a massive verified database of global and regional foods. 
            </p>
            <ul className="space-y-4 text-text-secondary">
              <li className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 text-brand-400">✓</div>
                <span>Fast, intuitive food search and logging.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 text-brand-400">✓</div>
                <span>Save your frequent meals for one-tap tracking.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 text-brand-400">✓</div>
                <span>Custom macro targets that adjust on rest vs. training days.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
