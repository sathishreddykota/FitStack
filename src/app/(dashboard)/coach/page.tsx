import type { Metadata } from "next";
import { CoachClient } from "./coach-client";
import { PremiumGate } from "@/components/shared/premium-gate";

export const metadata: Metadata = {
  title: "AI Coach",
  description: "Get personalised recommendations, meal suggestions, and training advice powered by AI.",
};

export default function CoachPage() {
  return (
    <PremiumGate title="Unlock Your Personal AI Coach" description="Upgrade to PRO to chat with the Gemini AI Coach. Get instant personalized advice, workout critiques, and form checks.">
      <CoachClient />
    </PremiumGate>
  );
}
