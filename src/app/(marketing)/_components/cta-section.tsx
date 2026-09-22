import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background with brand gradient */}
      <div className="absolute inset-0 brand-gradient opacity-20 pointer-events-none" />
      
      <div className="mx-auto max-w-4xl px-6 relative z-10 text-center">
        <div className="inline-block mb-6 p-3 rounded-2xl bg-surface-1/50 border border-white/10 shadow-elevated">
          <div className="text-4xl">🏋️</div>
        </div>
        
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-white mb-6">
          Ready to build your strongest version?
        </h2>
        
        <p className="text-xl text-text-primary/80 mb-10 max-w-2xl mx-auto">
          Track your nutrition. Train with purpose. Measure your progress. Start building the athlete today.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="w-full sm:w-auto font-semibold bg-white text-black hover:bg-white/90">
              Start Free
            </Button>
          </Link>
          <p className="text-sm text-text-muted sm:hidden mt-2">No credit card required.</p>
        </div>
        <p className="hidden sm:block text-sm text-text-muted mt-6">No credit card required. Free tier available.</p>
      </div>
    </section>
  );
}
