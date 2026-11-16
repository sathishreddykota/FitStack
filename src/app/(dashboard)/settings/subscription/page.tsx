import type { Metadata } from "next";
import { entitlementOf, requireUser } from "@/server/auth";
import { PRO_GRANT_DAYS, PRO_PRICE_PAISE } from "@/server/entitlements";
import { paymentHistory } from "@/server/payments";
import { SubscriptionClient } from "./subscription-client";

export const metadata: Metadata = {
  title: "FitStack PRO",
  description: "Upgrade to FitStack PRO",
};

export default async function SubscriptionPage() {
  const user = await requireUser();
  const plan = entitlementOf(user);
  const payments = await paymentHistory(user.id);

  return (
    <SubscriptionClient
      plan={{
        isPro: plan.isPro,
        source: plan.source,
        proUntil: plan.proUntil?.toISOString() ?? null,
        daysLeft: plan.daysLeft,
      }}
      price={{ amountPaise: PRO_PRICE_PAISE, days: PRO_GRANT_DAYS }}
      payments={payments.map((p) => ({ ...p, paidAt: p.paidAt?.toISOString() ?? null }))}
      prefill={{ name: user.name ?? "", email: user.email.endsWith("@no-email.fitstack") ? "" : user.email }}
    />
  );
}
