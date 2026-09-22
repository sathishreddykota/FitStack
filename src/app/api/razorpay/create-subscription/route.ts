import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { getRazorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getRequiredUser();
    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    // 1. Create a Razorpay subscription
    // Using standard Razorpay API to create a subscription for the given plan
    const razorpay = getRazorpay();
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120, // max billing cycles (e.g., 10 years for monthly)
      customer_notify: 1,
      notes: {
        userId: user.id, // Store userId in notes so webhook knows who paid
      },
    });

    // 2. We don't save the active subscription to Prisma yet. 
    // We wait for the webhook `subscription.charged` or `subscription.authenticated`
    // to confirm payment was successful before upgrading the user.

    // 3. Return the subscription_id to the client so they can launch checkout
    return NextResponse.json({
      subscriptionId: subscription.id,
    });
  } catch (error: any) {
    console.error("[RAZORPAY_CREATE_SUB]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
