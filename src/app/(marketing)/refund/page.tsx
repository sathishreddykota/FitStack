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
        <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">1. Cancellations</h2>
        <p>You may cancel your FitStack PRO subscription at any time. When you cancel, your subscription will remain active until the end of your current billing cycle. After the billing cycle ends, you will not be charged again and your account will revert to the Free tier.</p>
        <p>To cancel, simply navigate to the <strong>Settings &gt; Subscription</strong> page within the app and click "Cancel Subscription".</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">2. Refunds</h2>
        <p>Unless otherwise required by law, we do not offer refunds for any partial-month subscription periods or unused services. All charges processed are final.</p>
        <p>If you believe you were charged in error, please contact our support team immediately.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">3. Modifications</h2>
        <p>We reserve the right to modify our subscription prices at any time. Any price changes will be communicated to you in advance and will only apply to future billing cycles.</p>
      </div>
    </div>
  );
}
