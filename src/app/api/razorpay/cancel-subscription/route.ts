import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Razorpay from "razorpay";
import { SubscriptionTier } from "@prisma/client";

export async function POST() {
  try {
    const user = await getRequiredUser();

    // 1. Fetch user's subscription record
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription || !subscription.razorpaySubscriptionId) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
    }

    if (subscription.tier === SubscriptionTier.FREE || subscription.status === "cancelled") {
      return NextResponse.json({ error: "Subscription is already cancelled or free." }, { status: 400 });
    }

    // 2. Initialize Razorpay
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // 3. Call Razorpay API to cancel subscription immediately
    // By passing cancel_at_cycle_end: false, it cancels immediately. 
    // To cancel at cycle end, set cancel_at_cycle_end: 1
    const rzpSub = await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, false);

    // 4. Update Database State
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: "cancelled",
        tier: SubscriptionTier.FREE,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: SubscriptionTier.FREE },
    });

    return NextResponse.json({ success: true, subscription: rzpSub });
  } catch (error: any) {
    console.error("[RAZORPAY_CANCEL]", error);
    return NextResponse.json({ error: error.message || "Failed to cancel subscription" }, { status: 500 });
  }
}
