import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Daystrong account",
};

// Clerk handles the auth logic; the [[...sign-in]] catch-all is required by Clerk.
// In the Android app, AuthCard swaps in a Google button that works there.
export default function SignInPage() {
  return <AuthCard kind="sign-in" />;
}
