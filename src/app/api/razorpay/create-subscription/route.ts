import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { getRazorpay } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const user = await getRequiredUser();
    
    // We don't need a planId for standard one-time orders
    // We will hardcode the price to 199 INR (19900 paise)
    
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: 19900, // 199.00 INR
      currency: "INR",
      receipt: `receipt_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id, // Store userId so webhook knows who paid
        type: "pro_1_month"
      },
    });

    // Return the order_id to the client so they can launch checkout
    return NextResponse.json({
      orderId: order.id,
    });
  } catch (error: any) {
    console.error("[RAZORPAY_CREATE_ORDER]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
