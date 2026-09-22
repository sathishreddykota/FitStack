import { getRequiredUser } from "@/lib/auth";
import type { Metadata } from "next";
import { format } from "date-fns";
import { RecoveryClient } from "./recovery-client";
import { getRecoveryDashboardData, getRecoveryTrends } from "@/lib/services/recovery-service";
import { PremiumGate } from "@/components/shared/premium-gate";

export const metadata: Metadata = {
  title: "Sleep & Recovery",
  description: "Track sleep quality, mood, energy, and daily habits to optimise recovery.",
};

export default async function RecoveryPage() {
  const user = await getRequiredUser();
  
  // Use local formatting to get the correct current date string for the user
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [dashboardData, trendsData] = await Promise.all([
    getRecoveryDashboardData(user.id, todayStr),
    getRecoveryTrends(user.id),
  ]);

  return (
    <PremiumGate title="Unlock Recovery & Sleep" description="Upgrade to PRO to track your sleep quality, mood, energy, and optimize your rest days.">
      <RecoveryClient 
        initialData={dashboardData}
        trendsData={trendsData}
        todayStr={todayStr}
      />
    </PremiumGate>
  );
}
