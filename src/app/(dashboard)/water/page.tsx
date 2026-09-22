import { getRequiredUser } from "@/lib/auth";
import type { Metadata } from "next";
import { WaterClient } from "./water-client";
import { getWaterDashboardData, getWaterTrends } from "@/lib/services/water-service";
import { PremiumGate } from "@/components/shared/premium-gate";

export const metadata: Metadata = {
  title: "Water Tracking",
  description: "Log your daily water intake and hit your hydration targets.",
};

export default async function WaterPage() {
  const user = await getRequiredUser();
  const today = new Date();

  const [dashboardData, trendsData] = await Promise.all([
    getWaterDashboardData(user.id, today),
    getWaterTrends(user.id),
  ]);

  return (
    <PremiumGate title="Unlock Next-Level Hydration" description="Upgrade to PRO to access our beautiful animated water tracker and hit your daily goals like a boss.">
      <WaterClient 
        initialData={dashboardData}
        trendsData={trendsData}
      />
    </PremiumGate>
  );
}
