import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms and Conditions for FitStack",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Terms and Conditions</h1>
      <div className="prose prose-invert max-w-none text-text-secondary space-y-6">
        <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">1. Introduction</h2>
        <p>Welcome to FitStack. By accessing and using this website/app, you accept and agree to be bound by the terms and provision of this agreement.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">2. Use of the App</h2>
        <p>FitStack provides fitness tracking, nutrition logging, and AI coaching. You must use this app in compliance with all applicable laws and not for any unlawful purpose.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">3. Payments and Subscriptions</h2>
        <p>FitStack offers premium services through a "PRO" subscription. By upgrading to PRO, you agree to pay the monthly or yearly fees associated with the subscription. Payments are processed securely via Razorpay.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">4. Health Disclaimer</h2>
        <p>FitStack is not a medical professional. The fitness and nutrition data provided by the app (including the AI Coach) is for informational purposes only. Consult with a physician before starting any diet or exercise program.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">5. Termination</h2>
        <p>We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
      </div>
    </div>
  );
}
