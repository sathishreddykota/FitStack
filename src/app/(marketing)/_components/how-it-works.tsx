export function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Set your goal",
      desc: "Tell us if you want to bulk, cut, or recomp. We calculate the exact macros."
    },
    {
      num: "02",
      title: "Track nutrition & training",
      desc: "Log your food and your lifts in one unified dashboard."
    },
    {
      num: "03",
      title: "Measure your progress",
      desc: "Watch your weight trend and strength go up over time."
    },
    {
      num: "04",
      title: "Adapt your plan",
      desc: "Let AI suggest adjustments when you stall, so you never waste a week."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-surface-1 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-text-primary mb-4">
            How it works
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-surface-3" />
          
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-surface-1 border-2 border-brand-500 flex items-center justify-center text-brand-400 font-bold mb-6 relative z-10 shadow-glow-brand">
                {step.num}
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">{step.title}</h3>
              <p className="text-sm text-text-secondary">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
