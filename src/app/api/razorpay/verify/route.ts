import { z } from "zod";
import { HttpError, ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { isValidCheckoutSignature, markOrderPaid } from "@/server/payments";

const body = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

// POST /api/razorpay/verify — called by Checkout's success handler
export const POST = route("POST /api/razorpay/verify", async (req) => {
  const user = await requireApiUser();
  const p = await parseBody(req, body);
  if (!isValidCheckoutSignature(p.razorpay_order_id, p.razorpay_payment_id, p.razorpay_signature)) {
    throw new HttpError(400, "Payment signature is invalid.", "PAYMENT");
  }
  const result = await markOrderPaid({
    razorpayOrderId: p.razorpay_order_id,
    razorpayPaymentId: p.razorpay_payment_id,
    expectedUserId: user.id,
  });
  return ok(result);
});
