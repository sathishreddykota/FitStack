import type { Metadata } from "next";
import { requireOnboardedUser, todayOf } from "@/server/auth";
import { PremiumGate } from "@/components/shared/premium-gate";
import { RecordLoader } from "./record-loader";

export const metadata: Metadata = { title: "Record a run" };

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ simulate?: string }> }) {
  const user = await requireOnboardedUser();
  const { simulate } = await searchParams;
  return (
    <PremiumGate
      title="Track runs, walks and rides"
      description="Live GPS distance, pace and route maps, km splits and automatic personal bests."
      perks={["Live distance, pace and route map", "Splits for every kilometre", "Personal bests: 1K, 5K, 10K, half", "Your coach reads your runs"]}
    >
      <RecordLoader
        today={todayOf(user).str}
        // Fake GPS for testing indoors — never in production.
        simulate={simulate === "1" && process.env.NODE_ENV !== "production"}
      />
    </PremiumGate>
  );
}
