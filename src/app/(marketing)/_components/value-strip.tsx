export function ValueStrip() {
  return (
    <section className="border-y border-white/5 bg-surface-1/30">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 divide-y md:divide-y-0 md:divide-x divide-white/10">
          
          <div className="flex flex-col items-center text-center md:items-start md:text-left pt-8 md:pt-0 md:px-8 first:pt-0 first:pl-0 last:pr-0">
            <h3 className="text-xl font-bold text-text-primary mb-3">Aesthetic</h3>
            <p className="text-text-secondary">
              Build balanced muscle and improve physique. Track your macros perfectly to hit your goals.
            </p>
          </div>

          <div className="flex flex-col items-center text-center md:items-start md:text-left pt-8 md:pt-0 md:px-8">
            <h3 className="text-xl font-bold text-text-primary mb-3">Strength</h3>
            <p className="text-text-secondary">
              Track progressive overload and personal records. Log sets, reps, and RPE with precision.
            </p>
          </div>

          <div className="flex flex-col items-center text-center md:items-start md:text-left pt-8 md:pt-0 md:px-8">
            <h3 className="text-xl font-bold text-text-primary mb-3">Athletic</h3>
            <p className="text-text-secondary">
              Run, condition, move and perform better. Balance heavy lifting with cardiovascular health.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
