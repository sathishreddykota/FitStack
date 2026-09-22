import { 
  Apple, 
  BrainCircuit, 
  Dumbbell, 
  Droplet, 
  LineChart, 
  Target, 
  ActivitySquare
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Nutrition Tracking",
    description: "Search a verified database of foods. Log meals quickly with serving sizes and custom portions.",
    icon: <Apple className="h-6 w-6 text-brand-400" />
  },
  {
    title: "Calorie & Macro Targets",
    description: "Dynamic targets based on your goals (cut, bulk, maintain) calculated using Mifflin-St Jeor.",
    icon: <Target className="h-6 w-6 text-accent-400" />
  },
  {
    title: "Hybrid Strength Training",
    description: "Combine compound lifts, hypertrophy isolation, and conditioning without compromising progress.",
    icon: <Dumbbell className="h-6 w-6 text-highlight-500" />
  },
  {
    title: "Workout Logging",
    description: "Track sets, reps, weight, RPE, and rest times. See your history while you lift.",
    icon: <ActivitySquare className="h-6 w-6 text-info-400" />
  },
  {
    title: "Progress Analytics",
    description: "Visualize weight trends, 1RM progression, and workout volume with beautiful charts.",
    icon: <LineChart className="h-6 w-6 text-success-400" />
  },
  {
    title: "Water & Recovery",
    description: "Track hydration, sleep quality, and daily habits to ensure you recover as hard as you train.",
    icon: <Droplet className="h-6 w-6 text-blue-400" />
  },
  {
    title: "AI Coach",
    description: "Get personalized insights and adjustments based on your actual logged data.",
    icon: <BrainCircuit className="h-6 w-6 text-purple-400" />
  }
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-24 bg-surface-0">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-text-primary mb-4">
            Everything you need in one place
          </h2>
          <p className="mx-auto max-w-2xl text-text-secondary">
            Stop using three different apps for your diet, lifting, and cardio. FitStack integrates it all.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <Card key={idx} className="bg-surface-1/50 border-white/5 hover:border-brand-500/30 hover:bg-surface-1 transition-all duration-300">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-surface-2 border border-white/10">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
          
          {/* Decorative empty card to fill the grid if needed, or CTA card */}
          <Card className="bg-brand-500/10 border-brand-500/20 flex flex-col items-center justify-center text-center p-6 lg:col-span-1 xl:col-span-1">
             <h3 className="text-lg font-bold text-brand-300 mb-2">And more...</h3>
             <p className="text-sm text-brand-300/70">Continuous updates for the hybrid athlete.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
