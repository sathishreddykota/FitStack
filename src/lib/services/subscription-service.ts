import { prisma } from "@/lib/prisma";
import { SubscriptionTier } from "@prisma/client";

export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  return user?.subscriptionTier || SubscriptionTier.FREE;
}

export async function isProOrElite(userId: string): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId);
  return tier === SubscriptionTier.PRO || tier === SubscriptionTier.ELITE;
}
