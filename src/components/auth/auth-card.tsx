"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SignIn, SignUp } from "@clerk/nextjs";
import { nativeAuthAvailable, startGoogleSignIn } from "@/lib/native-auth";

// ─────────────────────────────────────────────
// Clerk's sign-in / sign-up card, styled for FitStack.
// In the Android app, Clerk's Google button is redirected through a browser tab
// (Google blocks its sign-in inside app web views).
// ─────────────────────────────────────────────

const elements = {
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
    "bg-[var(--color-brand-500)] hover:bg-white text-black font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(255,107,44,0.4)] transition-all h-12",
  otpCodeFieldInput:
    "bg-[var(--color-surface-1)] border-[var(--color-border)] text-white !text-xl font-bold rounded-lg focus:ring-2 focus:ring-[var(--color-brand-500)]",
  footerActionLink: "text-[var(--color-brand-400)] hover:text-white transition-colors font-bold",
  identityPreviewText: "text-[var(--color-text-secondary)]",
  identityPreviewEditButtonIcon: "text-[var(--color-brand-400)]",
};

const variables = {
  colorPrimary: "#FF6B2C", // Ember
  colorTextOnPrimaryBackground: "black",
  colorBackground: "transparent",
  colorInputText: "white",
  colorInputBackground: "transparent",
  colorText: "white",
};

const noSubscribe = () => () => {};

/** Clerk's Google button (block or icon style). */
const GOOGLE_BUTTON = ".cl-socialButtonsBlockButton__google, .cl-socialButtonsIconButton__google";

export function AuthCard({ kind }: { kind: "sign-in" | "sign-up" }) {
  const native = useSyncExternalStore(noSubscribe, nativeAuthAvailable, () => false);
  const [busy, setBusy] = useState(false);
  const Card = kind === "sign-in" ? SignIn : SignUp;

  // In the app, a tap on Clerk's Google button is caught here (capture phase, before
  // Clerk sees it) and sent through the browser-tab flow instead.
  function onClickCapture(e: React.MouseEvent) {
    if (!native || !(e.target instanceof Element) || !e.target.closest(GOOGLE_BUTTON)) return;
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    startGoogleSignIn()
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't open Google sign-in."))
      .finally(() => setBusy(false));
  }

  return (
    <div className="w-full" onClickCapture={onClickCapture} aria-busy={busy}>
      <Card appearance={{ elements, variables }} />
    </div>
  );
}
