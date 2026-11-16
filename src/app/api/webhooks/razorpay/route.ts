import { NextResponse } from "next/server";
import { HttpError } from "@/server/http";
import { isValidWebhookSignature, markOrderFailed, markOrderPaid } from "@/server/payments";

// POST /api/webhooks/razorpay — source of truth for payments.
// Subscribe to: order.paid, payment.failed
export async function POST(req: Request) {
  const raw = await req.text();
  if (!isValidWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: Record<string, { entity?: Record<string, unknown> }> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  try {
    if (event.event === "order.paid") {
      const order = event.payload?.order?.entity;
      const payment = event.payload?.payment?.entity;
      if (typeof order?.id === "string" && typeof payment?.id === "string") {
        await markOrderPaid({
          razorpayOrderId: order.id,
          razorpayPaymentId: payment.id,
          paidAmountPaise: typeof order.amount_paid === "number" ? order.amount_paid : undefined,
        });
      }
    } else if (event.event === "payment.failed") {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (typeof orderId === "string") await markOrderFailed(orderId);
    }
  } catch (err) {
    // Unknown orders (e.g. created by another app on the same account) are acknowledged, not retried forever.
    if (err instanceof HttpError && err.status < 500) {
      console.warn("[razorpay webhook] ignored:", err.message);
      return NextResponse.json({ received: true, ignored: err.message });
    }
    console.error("[razorpay webhook]", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
