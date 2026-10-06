import { getRequiredUser } from "@/lib/auth";
import { getUserSubscriptionTier } from "@/lib/services/subscription-service";
import type { Metadata } from "next";
import { SubscriptionClient } from "./subscription-client";

export const metadata: Metadata = {
  title: "Subscription",
  description: "Manage your FitStack Pro subscription",
};

export default async function SubscriptionPage() {
  const user = await getRequiredUser();
  const tier = await getUserSubscriptionTier(user.id);
  
  // Trial Logic
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const isTrialing = tier !== "PRO" && tier !== "ELITE" && user.createdAt > oneWeekAgo;

  return <SubscriptionClient currentTier={tier} isTrialing={isTrialing} />;
}
