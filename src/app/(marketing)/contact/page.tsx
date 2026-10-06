import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact FitStack Support",
};

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Contact Us</h1>
      <div className="prose prose-invert max-w-none text-text-secondary space-y-6">
        <p>Have a question or need support with your FitStack account? We're here to help.</p>

        <div className="bg-surface-1 p-8 rounded-2xl border border-border mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Support Channels</h2>

          <div className="space-y-4">
            <div>
              <strong className="block text-text-primary">Email Support:</strong>
              <a href="mailto:support@fitstack.app" className="text-brand-500 hover:underline">support@fitstack.app</a>
              <p className="text-sm mt-1">We aim to respond to all inquiries within 24-48 hours.</p>
            </div>

            <div className="pt-4">
              <strong className="block text-text-primary">Business Address:</strong>
              <p className="text-sm mt-1">
                FitStack Technologies<br />
                5-26/A,Gas Center<br />
                Bhadrachalam,Telengana.507111<br />
                India
              </p>
            </div>

            <div className="pt-4">
              <strong className="block text-text-primary">Phone:</strong>
              <p className="text-sm mt-1">+91 [Insert Phone Number]</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
