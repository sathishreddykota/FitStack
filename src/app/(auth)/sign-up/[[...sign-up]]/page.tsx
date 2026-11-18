import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your FitStack account and start your fitness journey",
};

// Clerk handles the auth logic; the [[...sign-up]] catch-all is required by Clerk.
// In the Android app, AuthCard swaps in a Google button that works there.
export default function SignUpPage() {
  return <AuthCard kind="sign-up" />;
}
