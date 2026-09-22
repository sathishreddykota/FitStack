import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { SubscriptionTier } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const user = await getRequiredUser();
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing Razorpay payment parameters" }, { status: 400 });
    }

    // Razorpay subscription signature verification
    // string to hash = razorpay_payment_id + "|" + subscription_id
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Signature is valid, we can synchronously upgrade the user to PRO
    // The webhook will also fire eventually, but this gives instant feedback
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tier: SubscriptionTier.PRO,
        razorpaySubscriptionId: razorpay_subscription_id,
        status: "active", // Assume active if first payment succeeded
      },
      update: {
        tier: SubscriptionTier.PRO,
        razorpaySubscriptionId: razorpay_subscription_id,
        status: "active",
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: SubscriptionTier.PRO },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[RAZORPAY_VERIFY]", error);
    return NextResponse.json({ error: error.message || "Failed to verify payment" }, { status: 500 });
  }
}
