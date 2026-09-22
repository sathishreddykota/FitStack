import { HeroSection } from "./_components/hero-section";
import { ValueStrip } from "./_components/value-strip";
import { FeatureGrid } from "./_components/feature-grid";
import { HybridTraining } from "./_components/hybrid-training";
import { NutritionShowcase } from "./_components/nutrition-showcase";
import { ProgressShowcase } from "./_components/progress-showcase";
import { AiCoachPreview } from "./_components/ai-coach-preview";
import { HowItWorks } from "./_components/how-it-works";
import { CtaSection } from "./_components/cta-section";

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <ValueStrip />
      <FeatureGrid />
      <HybridTraining />
      <NutritionShowcase />
      <ProgressShowcase />
      <AiCoachPreview />
      <HowItWorks />
      <CtaSection />
    </>
  );
}
