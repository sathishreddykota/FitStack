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
      case "order.paid": {
        const order = event.payload.order.entity;
        const userId = order.notes?.userId;

        if (!userId) break;

        const tier = "PRO";
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            tier: tier,
            razorpaySubscriptionId: order.id, // We store the order ID here for reference
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: thirtyDaysFromNow,
          },
          update: {
            tier: tier,
            razorpaySubscriptionId: order.id,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: thirtyDaysFromNow,
          },
        });

        // Update the user's tier
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: tier },
        });
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
