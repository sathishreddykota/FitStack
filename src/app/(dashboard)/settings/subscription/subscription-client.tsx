"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Props {
  plan: { isPro: boolean; source: "trial" | "paid" | null; proUntil: string | null; daysLeft: number };
  price: { amountPaise: number; days: number };
  payments: { id: string; amountPaise: number; grantDays: number; paidAt: string | null; razorpayPaymentId: string | null }[];
  prefill: { name: string; email: string };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

type RazorpayCtor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, cb: (r: { error: { description: string } }) => void) => void;
};

const FREE_FEATURES = ["Food logging with 200+ Indian foods", "Quick add & saved meals", "Water & weight tracking", "Manual workout logging"];
const PRO_FEATURES = [
  "AI Coach that reads your real data",
  "Log food & workouts by voice or text",
  "Personal training plans + calendar",
  "Progress, strength & PR analytics",
  "Sleep & recovery tracking",
  "Daily AI insight",
];

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: RazorpayCtor }).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function SubscriptionClient({ plan, price, payments, prefill }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCheckout();
  }, []);

  const buy = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!(await loadCheckout())) throw new Error("Couldn't load the payment window. Check your connection.");
      const order = await api<{ orderId: string; amount: number; currency: string; keyId: string }>(
        "/api/razorpay/create-order",
        { method: "POST" },
      );
      const Razorpay = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
      const rzp = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Daystrong PRO",
        description: `${price.days} days of PRO`,
        prefill,
        theme: { color: "#FF6B2C" },
        handler: async (res: RazorpayResponse) => {
          try {
            const result = await api<{ status: string; proUntil: string | null }>("/api/razorpay/verify", { body: res });
            toast.success(
              result.proUntil ? `You're PRO until ${fmtDate(result.proUntil)} 🎉` : "Payment received — you're PRO 🎉",
            );
            router.refresh();
          } catch (err) {
            // The webhook will still grant PRO if the payment went through.
            setError(`Payment received, confirming it took longer than usual: ${errorMessage(err)}. Refresh in a minute.`);
          } finally {
            setIsLoading(false);
          }
        },
        modal: { ondismiss: () => setIsLoading(false) },
      });
      rzp.on("payment.failed", (r) => {
        setError(r.error.description);
        setIsLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(errorMessage(err));
      setIsLoading(false);
    }
  };

  const paid = plan.source === "paid";

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-10 pb-12">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[var(--color-text-primary)] lg:text-5xl">Daystrong PRO</h1>
        <p className="text-lg text-[var(--color-text-secondary)]">
          Everything premium fitness apps charge ₹500+ for, at {rupees(price.amountPaise)} a month.
        </p>
        {plan.isPro && plan.proUntil && (
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-500)]/10 px-4 py-1.5 text-sm font-bold text-[var(--color-brand-400)]">
            <Sparkles className="h-4 w-4" />
            {plan.source === "trial" ? "Free trial" : "PRO"} active until {fmtDate(plan.proUntil)} · {plan.daysLeft}{" "}
            {plan.daysLeft === 1 ? "day" : "days"} left
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-error-500)]/20 bg-[var(--color-error-500)]/10 p-4 text-[var(--color-error-500)]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div
          className={cn(
            "rounded-3xl border p-8",
            !plan.isPro ? "border-[var(--color-border)] bg-[var(--color-surface-1)]" : "border-[var(--color-border-subtle)] opacity-70",
          )}
        >
          <h3 className="mb-2 text-2xl font-black text-[var(--color-text-primary)]">Free</h3>
          <p className="mb-6 text-5xl font-black text-[var(--color-text-primary)]">₹0</p>
          <ul className="space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                <Check className="h-5 w-5 shrink-0 text-[var(--color-brand-400)]" />
                {f}
              </li>
            ))}
          </ul>
          {!plan.isPro && (
            <p className="mt-8 rounded-xl border border-[var(--color-border)] py-3 text-center text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Current plan
            </p>
          )}
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-brand-500)] bg-[var(--color-surface-1)] p-8 shadow-[0_0_30px_rgba(255,107,44,0.15)]">
          <h3 className="mb-2 text-2xl font-black text-[var(--color-brand-400)]">PRO</h3>
          <p className="mb-6 flex items-end gap-2 text-[var(--color-text-primary)]">
            <span className="text-5xl font-black">{rupees(price.amountPaise)}</span>
            <span className="pb-1 font-medium text-[var(--color-text-secondary)]">/ {price.days} days</span>
          </p>
          <ul className="mb-8 space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[var(--color-text-primary)]">
                <Sparkles className="h-5 w-5 shrink-0 text-[var(--color-brand-500)]" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={buy}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-500)] py-4 font-black uppercase tracking-widest text-black transition-all hover:bg-white disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            {paid ? `Add ${price.days} more days` : plan.source === "trial" ? "Get PRO now" : "Upgrade to PRO"}
          </button>
          <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
            One-time payment via UPI, cards or netbanking. No auto-renewal{paid ? " — new days are added to your current period" : ""}.
          </p>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6">
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">Payment history</h2>
          <ul className="divide-y divide-[var(--color-border)]">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-[var(--color-text-secondary)]">{p.paidAt ? fmtDate(p.paidAt) : "—"}</span>
                <span className="text-[var(--color-text-muted)]">+{p.grantDays} days</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{rupees(p.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
