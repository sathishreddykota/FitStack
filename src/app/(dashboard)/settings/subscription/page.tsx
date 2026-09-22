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

  return <SubscriptionClient currentTier={tier} />;
}
