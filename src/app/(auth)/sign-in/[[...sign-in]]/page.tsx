import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your FitStack account",
};

// ─────────────────────────────────────────────
// Sign-In Page
// ─────────────────────────────────────────────
// Clerk handles all the auth logic.
// The [[...sign-in]] catch-all is required by Clerk.

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "w-full bg-transparent shadow-none border-0",
          headerTitle: "text-white font-black text-2xl uppercase tracking-tight",
          headerSubtitle: "text-[var(--color-text-secondary)]",
          socialButtonsBlockButton:
            "border border-[var(--color-border)] bg-[var(--color-surface-1)] text-white hover:bg-[var(--color-surface-2)] transition-colors h-11",
          socialButtonsBlockButtonText: "font-semibold tracking-wide",
          dividerLine: "bg-[var(--color-border)]",
          dividerText: "text-[var(--color-text-muted)]",
          formFieldLabel: "text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider",
          formFieldInput:
            "bg-[var(--color-surface-1)] border-[var(--color-border)] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-brand-500)] h-11",
          formButtonPrimary:
            "bg-[var(--color-brand-500)] hover:bg-white text-black font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(255,87,34,0.4)] transition-all h-12",
          otpCodeFieldInput:
            "bg-[var(--color-surface-1)] border-[var(--color-border)] text-white !text-xl font-bold rounded-lg focus:ring-2 focus:ring-[var(--color-brand-500)]",
          footerActionLink: "text-[var(--color-brand-400)] hover:text-white transition-colors font-bold",
          identityPreviewText: "text-[var(--color-text-secondary)]",
          identityPreviewEditButtonIcon: "text-[var(--color-brand-400)]",
        },
        variables: {
          colorPrimary: "oklch(65% 0.24 35)", // Neon Orange
          colorTextOnPrimaryBackground: "black",
          colorBackground: "transparent",
          colorInputText: "white",
          colorInputBackground: "transparent",
          colorText: "white",
        },
      }}
    />
  );
}
