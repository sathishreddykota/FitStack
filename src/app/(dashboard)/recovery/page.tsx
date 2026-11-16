import type { Metadata } from "next";
import { requireOnboardedUser, todayOf } from "@/server/auth";
import { recoveryForDay, recoveryTrend } from "@/server/tracking";
import { PremiumGate } from "@/components/shared/premium-gate";
import { RecoveryClient } from "./recovery-client";

export const metadata: Metadata = {
  title: "Sleep & Recovery",
  description: "Track sleep quality, mood, energy, and daily habits to optimise recovery.",
};

async function RecoveryData() {
  const user = await requireOnboardedUser();
  const today = todayOf(user).str;
  const [day, trend] = await Promise.all([recoveryForDay(user.id, today), recoveryTrend(user.id, today)]);
  return <RecoveryClient todayStr={today} initialData={day} trendsData={trend} />;
}

export default function RecoveryPage() {
  return (
    <PremiumGate
      title="Unlock Recovery & Sleep"
      description="Track sleep, mood, energy and soreness, and see how recovery affects your training."
    >
      <RecoveryData />
    </PremiumGate>
  );
}
