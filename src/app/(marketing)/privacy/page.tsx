import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for FitStack",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
      <div className="prose prose-invert max-w-none text-text-secondary space-y-6">
        <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">1. Information We Collect</h2>
        <p>When you use FitStack, we collect data you provide directly to us including: account information (name, email), physical characteristics (weight, height, age), and activity data (workouts, meals, sleep, water intake).</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">2. How We Use Your Information</h2>
        <p>We use the information we collect to provide, maintain, and improve our services, including personalization of AI coaching responses, macro calculations, and progress analytics.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">3. Data Security</h2>
        <p>We implement security measures designed to protect your information from unauthorized access. Your payment information is securely processed by Razorpay and is not stored on our servers.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">4. Sharing of Information</h2>
        <p>We do not sell your personal data to third parties. We may share data with service providers (like payment processors and AI APIs) solely for the purpose of operating the FitStack app.</p>

        <h2 className="text-2xl font-semibold text-text-primary mt-8">5. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us via our Contact page.</p>
      </div>
    </div>
  );
}
