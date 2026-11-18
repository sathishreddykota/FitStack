"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { NativeAuthShell } from "../shell";

/**
 * Link back into the app. An Android "intent:" link names the app's package, so
 * Chrome hands it only to FitStack. It carries just the hand-off id — useless
 * without the secret the app kept.
 */
const appLink = (id: string) => `intent://auth?id=${id}#Intent;scheme=com.fitstack.app;package=com.fitstack.app;end`;

/** How long to wait for the session before saying sign-in didn't finish. */
const WAIT_MS = 8000;

export function DoneClient({ id }: { id: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<"waiting" | "ready" | "failed">("waiting");
  const sent = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setState((s) => (s === "waiting" ? "failed" : s)), WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || sent.current) return;
    sent.current = true;
    fetch("/api/native-auth/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      .then((r) => {
        if (!r.ok) throw new Error();
        setState("ready");
        window.location.href = appLink(id);
      })
      .catch(() => setState("failed"));
  }, [isLoaded, isSignedIn, id]);

  if (state === "failed") return <NativeAuthShell title="Sign-in didn't finish" body="Go back to the FitStack app and tap “Continue with Google” again." />;
  if (state === "waiting") return <NativeAuthShell title="Signing you in…" body="Just a moment." spinner />;
  return (
    <NativeAuthShell title="You're signed in ✓" body="Taking you back to the FitStack app…">
      <a href={appLink(id)} className="mt-2 rounded-full bg-[var(--color-brand-500)] px-6 py-3 font-bold text-black">
        Open FitStack
      </a>
    </NativeAuthShell>
  );
}
