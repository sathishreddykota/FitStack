import type { Metadata } from "next";
import { CoachClient } from "./coach-client";
import { PremiumGate } from "@/components/shared/premium-gate";

export const metadata: Metadata = {
  title: "AI Coach",
  description: "Get personalised recommendations, meal suggestions, and training advice powered by AI.",
};

export default function CoachPage() {
  return (
    <PremiumGate title="Unlock Your Personal AI Coach" description="A coach that reads your real food, training and recovery data, answers in seconds, and can log meals for you.">
      <CoachClient />
    </PremiumGate>
  );
}
