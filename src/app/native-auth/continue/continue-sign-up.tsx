"use client";

import { useSyncExternalStore } from "react";
import { SignUp } from "@clerk/nextjs";
import { NativeAuthShell } from "../shell";

const noSubscribe = () => () => {};

export function ContinueSignUp({ id }: { id: string | null }) {
  // The return address needs this page's origin, known only in the browser.
  const done = useSyncExternalStore(
    noSubscribe,
    () => (id ? `${window.location.origin}/native-auth/done?id=${id}` : ""),
    () => "",
  );
  if (!id) return <NativeAuthShell title="This sign-in link isn't valid" body="Go back to the Daystrong app and tap “Continue with Google” again." />;
  if (!done) return <NativeAuthShell title="One more step…" body="Loading." spinner />;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-surface-0)] px-4 py-10">
      <SignUp routing="hash" forceRedirectUrl={done} signInForceRedirectUrl={done} />
    </main>
  );
}
