import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity, Dumbbell, Flame, TrendingUp } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Background gradients */}
      <div className="hero-gradient absolute inset-0 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-surface-0 to-transparent pointer-events-none" />
      
      <div className="relative mx-auto max-w-7xl px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-400 mb-8 animate-slide-up" style={{ animationDelay: "0ms" }}>
          <span className="flex h-2 w-2 rounded-full bg-brand-500 shadow-glow-brand" />
          The all-in-one platform for hybrid athletes
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          Build the <span className="text-white">body.</span><br />
          Build the <span className="gradient-text">strength.</span><br />
          Build the <span className="text-white">athlete.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto max-w-2xl text-lg text-text-secondary md:text-xl mb-10 animate-slide-up" style={{ animationDelay: "200ms" }}>
          Track nutrition, strength training, conditioning, recovery and progress — all in one place. Stop switching apps and start seeing results.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "300ms" }}>
          <Link href="/sign-up">
            <Button size="lg" className="w-full sm:w-auto font-semibold">
              Start Free
            </Button>
          </Link>
          <Link href="#features">
            <Button variant="glass" size="lg" className="w-full sm:w-auto font-semibold">
              Explore FitStack
            </Button>
          </Link>
        </div>

        {/* Product Mockup Preview */}
        <div className="mt-20 mx-auto max-w-5xl animate-scale-in" style={{ animationDelay: "500ms" }}>
          <div className="relative rounded-2xl border border-white/10 bg-surface-1/50 backdrop-blur-xl p-2 shadow-elevated">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
              <div className="h-3 w-3 rounded-full bg-error-500/50" />
              <div className="h-3 w-3 rounded-full bg-warning-500/50" />
              <div className="h-3 w-3 rounded-full bg-success-500/50" />
            </div>
            
            {/* Dashboard Mock UI */}
            <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 bg-surface-0/50 rounded-b-xl min-h-[400px]">
              
              {/* Sidebar Mock */}
              <div className="hidden md:flex flex-col gap-4 col-span-3 border-r border-white/5 pr-6">
                <div className="h-8 w-32 bg-surface-2 rounded-md skeleton" />
                <div className="space-y-3 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded bg-surface-2 skeleton" />
                      <div className="h-4 w-full bg-surface-2 rounded skeleton" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Mock */}
              <div className="col-span-1 md:col-span-9 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="h-6 w-48 bg-surface-2 rounded skeleton mb-2" />
                    <div className="h-4 w-32 bg-surface-2 rounded skeleton opacity-50" />
                  </div>
                  <div className="h-10 w-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-brand-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Macro Cards */}
                  <div className="p-4 rounded-xl bg-surface-1 border border-white/5 flex flex-col gap-2">
                    <Flame className="h-5 w-5 text-calories" />
                    <div className="text-xl font-bold">2,140</div>
                    <div className="text-xs text-text-muted">Kcal Consumed</div>
                    <div className="progress-track mt-1"><div className="bg-calories h-full w-[70%]" /></div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-1 border border-white/5 flex flex-col gap-2">
                    <Dumbbell className="h-5 w-5 text-protein" />
                    <div className="text-xl font-bold">145g</div>
                    <div className="text-xs text-text-muted">Protein</div>
                    <div className="progress-track mt-1"><div className="bg-protein h-full w-[85%]" /></div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-1 border border-white/5 flex flex-col gap-2">
                    <TrendingUp className="h-5 w-5 text-carbs" />
                    <div className="text-xl font-bold">85kg</div>
                    <div className="text-xs text-text-muted">Bench Press</div>
                    <div className="progress-track mt-1"><div className="bg-brand-500 h-full w-[100%]" /></div>
                  </div>
                  <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 flex flex-col justify-center items-center text-center">
                    <span className="text-brand-400 font-medium text-sm">Great progress today!</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Glow effect underneath */}
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl blur-xl opacity-20 -z-10 pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
