import { ok, route } from "@/server/http";
import { entitlementOf, requireApiUser } from "@/server/auth";
import { PRO_GRANT_DAYS, PRO_PRICE_PAISE } from "@/server/entitlements";
import { paymentHistory } from "@/server/payments";

// GET /api/subscription — current plan, price and payment history
export const GET = route("GET /api/subscription", async () => {
  const user = await requireApiUser();
  return ok({
    plan: entitlementOf(user),
    price: { amountPaise: PRO_PRICE_PAISE, currency: "INR", days: PRO_GRANT_DAYS },
    payments: await paymentHistory(user.id),
  });
});
