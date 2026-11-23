"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { BellRing } from "lucide-react";
import {
  MEAL_LOGGED_EVENT,
  askForPush,
  hasStoredPushToken,
  pushAvailable,
  registerIfAllowed,
  shouldOfferPush,
  snoozePushOffer,
  startPushListeners,
  unregisterPush,
} from "@/lib/native-push";

// ─────────────────────────────────────────────
// Push notifications in the Android app (no-op in a browser):
//  · registers this phone with the server on every launch while signed in
//  · tapping a notification opens its screen
//  · after a meal is logged, offers notifications once (our card first, so a
//    "not now" doesn't burn Android's one-time system dialog)
//  · on sign-out, stops notifications to this phone
// ─────────────────────────────────────────────

export function PushSupport() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [offer, setOffer] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushAvailable()) return;
    startPushListeners((path) => router.push(path)).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!isLoaded || !pushAvailable()) return;
    if (isSignedIn) registerIfAllowed().catch(() => {});
    else if (hasStoredPushToken()) unregisterPush();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !pushAvailable()) return;
    const onLogged = () => {
      shouldOfferPush()
        .then((yes) => yes && setOffer(true))
        .catch(() => {});
    };
    window.addEventListener(MEAL_LOGGED_EVENT, onLogged);
    return () => window.removeEventListener(MEAL_LOGGED_EVENT, onLogged);
  }, [isSignedIn]);

  const allow = useCallback(async () => {
    setBusy(true);
    try {
      await askForPush();
    } finally {
      setBusy(false);
      setOffer(false);
    }
  }, []);

  const later = useCallback(() => {
    snoozePushOffer();
    setOffer(false);
  }, []);

  if (!offer) return null;
  return (
    <div
      role="dialog"
      aria-labelledby="push-offer-title"
      className="fs-rise fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 shadow-2xl"
    >
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-500)]/15 text-[var(--color-brand-400)]">
          <BellRing className="h-5 w-5" />
        </span>
        <div>
          <p id="push-offer-title" className="font-bold text-[var(--color-text-primary)]">
            Nice log! Want a nudge when you need one?
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            We&apos;ll remind you about missed meals and cheer when you hit your protein, calorie and fiber goals. At most 5 a day,
            never at night.
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={later}
          className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={allow}
          disabled={busy}
          className="rounded-full bg-[var(--color-brand-500)] px-5 py-2 text-sm font-bold text-black disabled:opacity-60"
        >
          Turn on reminders
        </button>
      </div>
    </div>
  );
}
