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
    select: { subscriptionTier: true, createdAt: true },
  });

  if (!user) {
    return { tier: SubscriptionTier.FREE, isTrial: false, daysLeft: 0, isLocked: true, hasPaid: false };
  }

  const trialEnd = new Date(user.createdAt);
  trialEnd.setDate(trialEnd.getDate() + 7);
  
  const now = new Date();
  const isTrial = now < trialEnd;
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24)));
  
  const hasPaid = user.subscriptionTier === SubscriptionTier.PRO || user.subscriptionTier === SubscriptionTier.ELITE;
  const isLocked = !isTrial && !hasPaid;

  return { tier: user.subscriptionTier, isTrial, daysLeft, isLocked, hasPaid };
}

export async function isProOrElite(userId: string): Promise<boolean> {
  const info = await getSubscriptionInfo(userId);
  return info.isTrial || info.hasPaid;
}
