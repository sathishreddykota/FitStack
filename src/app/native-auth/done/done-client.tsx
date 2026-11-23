"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { appLink, completeAndReturn } from "../hand-back";
import { NativeAuthShell } from "../shell";

/** How long to wait for the session before saying sign-in didn't finish. */
const WAIT_MS = 15000;

export function DoneClient({ id }: { id: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [state, setState] = useState<"waiting" | "ready" | "failed">("waiting");
  const sent = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setState((s) => (s === "waiting" ? "failed" : s)), WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || sent.current) return;
    sent.current = true;
    if (!clerk.session) return;
    completeAndReturn(clerk.session, id)
      .then(() => setState("ready"))
      .catch(() => setState("failed"));
  }, [isLoaded, isSignedIn, id, clerk]);

  if (state === "failed") return <NativeAuthShell title="Sign-in didn't finish" body="Go back to the Daystrong app and tap “Continue with Google” again." />;
  if (state === "waiting") return <NativeAuthShell title="Signing you in…" body="Just a moment." spinner />;
  return (
    <NativeAuthShell title="You're signed in ✓" body="Taking you back to the Daystrong app…">
      <a href={appLink(id)} className="mt-2 rounded-full bg-[var(--color-brand-500)] px-6 py-3 font-bold text-black">
        Open Daystrong
      </a>
    </NativeAuthShell>
  );
}
