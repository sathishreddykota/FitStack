import { prisma } from "@/lib/prisma";
import { SubscriptionTier } from "@prisma/client";

export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  return user?.subscriptionTier || SubscriptionTier.FREE;
}

export async function getSubscriptionInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, createdAt: true, subscription: true },
  });

  if (!user) {
    return { tier: SubscriptionTier.FREE, isTrial: false, daysLeft: 0, isLocked: true, hasPaid: false };
  }

  const trialEnd = new Date(user.createdAt);
  trialEnd.setDate(trialEnd.getDate() + 7);
  
  const now = new Date();
  const isTrial = now < trialEnd;
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24)));
  
  // Check One-Time Expiration
  let hasPaid = user.subscriptionTier === SubscriptionTier.PRO || user.subscriptionTier === SubscriptionTier.ELITE;
  
  if (hasPaid && user.subscription?.currentPeriodEnd) {
    if (now > user.subscription.currentPeriodEnd) {
      // PRO has expired!
      hasPaid = false;
      // We asynchronously downgrade them in the database so the cache clears
      prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: SubscriptionTier.FREE }
      }).catch(console.error);
    }
  }

  const isLocked = !isTrial && !hasPaid;

  return { 
    tier: hasPaid ? user.subscriptionTier : SubscriptionTier.FREE, 
    isTrial, 
    daysLeft, 
    isLocked, 
    hasPaid 
  };
}

export async function isProOrElite(userId: string): Promise<boolean> {
  const info = await getSubscriptionInfo(userId);
  return info.isTrial || info.hasPaid;
}
