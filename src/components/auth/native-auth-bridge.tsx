"use client";

import { useEffect, useRef } from "react";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { claimGoogleSignIn, listenForSignInReturn, nativeAuthAvailable } from "@/lib/native-auth";

/**
 * Android app only: when Google sign-in in the browser tab returns, sign in here
 * with the one-time ticket (directly through Clerk, not the sign-in screen), then
 * open the app. New accounts land on onboarding via the dashboard's own redirect.
 */
export function NativeAuthBridge() {
  const clerk = useClerk();
  const clerkRef = useRef(clerk);
  useEffect(() => {
    clerkRef.current = clerk;
  }, [clerk]);

  useEffect(() => {
    if (!nativeAuthAvailable()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;

    const onUrl = async (url: string) => {
      try {
        const ticket = await claimGoogleSignIn(url);
        if (!ticket) return;
        const c = clerkRef.current;
        // A cold start (app opened by the link) may arrive before Clerk has loaded.
        for (let i = 0; !c.loaded && i < 100; i++) await new Promise((r) => setTimeout(r, 100));
        const attempt = await c.client!.signIn.create({ strategy: "ticket", ticket });
        if (attempt.status !== "complete" || !attempt.createdSessionId) throw new Error("Sign-in didn't finish. Please try again.");
        await c.setActive({ session: attempt.createdSessionId });
        // A full load (not router.replace): the sign-in/sign-up screen underneath kept
        // the in-app navigation from taking effect, leaving a signed-in app on sign-up.
        window.location.replace(new URL("/dashboard", window.location.origin).href);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Sign-in didn't finish. Please try again.");
      }
    };

    listenForSignInReturn((url) => void onUrl(url))
      .then((s) => (cancelled ? s() : (stop = s)))
      .catch(() => {});
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}
