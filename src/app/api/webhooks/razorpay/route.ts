import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    switch (event.event) {
      case "subscription.charged":
      case "subscription.authenticated": {
        const subscription = event.payload.subscription.entity;
        const userId = subscription.notes?.userId;
        const planId = subscription.plan_id;

        if (!userId) break;

        // Determine tier (You can map specific plan IDs to PRO or ELITE)
        // For now, any successful subscription gets PRO
        const tier = "PRO";

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            tier: tier,
            razorpayCustomerId: subscription.customer_id,
            razorpaySubscriptionId: subscription.id,
            razorpayPlanId: planId,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_start * 1000),
            currentPeriodEnd: new Date(subscription.current_end * 1000),
          },
          update: {
            tier: tier,
            razorpayCustomerId: subscription.customer_id,
            razorpaySubscriptionId: subscription.id,
            razorpayPlanId: planId,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_start * 1000),
            currentPeriodEnd: new Date(subscription.current_end * 1000),
          },
        });

        // Update the user's cache/tier as well
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: tier },
        });
        break;
      }
      
      case "subscription.cancelled":
      case "subscription.halted": {
        const subscription = event.payload.subscription.entity;
        
        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            tier: "FREE", // Downgrade instantly, or you can manage `cancelAtPeriodEnd` logic
          },
        });

        // Find user by subscription ID and downgrade them
        const sub = await prisma.subscription.findUnique({
          where: { razorpaySubscriptionId: subscription.id },
        });

        if (sub) {
          await prisma.user.update({
            where: { id: sub.userId },
            data: { subscriptionTier: "FREE" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[RAZORPAY_WEBHOOK]", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
