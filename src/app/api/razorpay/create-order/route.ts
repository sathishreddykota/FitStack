import { ok, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { createProOrder } from "@/server/payments";

// POST /api/razorpay/create-order — start a ₹199 / 30-day PRO purchase
export const POST = route("POST /api/razorpay/create-order", async () => {
  const user = await requireApiUser();
  return ok(await createProOrder(user.id), { status: 201 });
});
