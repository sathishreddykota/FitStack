import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "Refund & Cancellation Policy for FitStack",
};

export default function RefundPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Refund & Cancellation Policy</h1>
      <div className="prose prose-invert max-w-none text-text-secondary space-y-6">
        <p><strong>Last updated: 16 November 2026</strong></p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">1. How PRO is billed</h2>
        <p>FitStack PRO is a one-time payment that gives you 30 days of PRO access. It does not renew automatically and we never charge you again unless you choose to buy more time. If you buy again while PRO is still active, the new days are added to the end of your current period.</p>
        <p>When your PRO period ends, your account moves to the Free plan. Your data is kept and free features keep working. There is nothing to cancel.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">2. Refunds</h2>
        <p>Unless otherwise required by law, we do not offer refunds for any partial-month subscription periods or unused services. All charges processed are final.</p>
        <p>If you believe you were charged in error, please contact our support team immediately.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">3. Modifications</h2>
        <p>We reserve the right to modify our subscription prices at any time. Any price changes will be communicated to you in advance and will only apply to future purchases.</p>
      </div>
    </div>
  );
}
