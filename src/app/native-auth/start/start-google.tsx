"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk, useSignIn } from "@clerk/nextjs";
import { NativeAuthShell } from "../shell";

/** Signs out any old session in this browser, then goes straight to Google. */
export function StartGoogle({ id }: { id: string | null }) {
  const clerk = useClerk();
  const { isLoaded, signIn } = useSignIn();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !isLoaded || !signIn || started.current) return;
    started.current = true;
    // Absolute URLs: Clerk finishes the Google step on its own domain first (dev mode),
    // where a relative "/native-auth/…" would point at Clerk's site instead of ours.
    const origin = window.location.origin;
    // Both return addresses go through the callback page: Clerk always finishes the
    // sign-in there (sets the session on this origin), and the callback then forwards
    // to /native-auth/done. Sending "complete" straight to done skipped that step on a
    // browser tab Clerk hadn't seen before, and done waited for a session that never came.
    const callback = `${origin}/native-auth/callback?id=${id}`;
    (async () => {
      // The browser may still be signed in from earlier (maybe as someone else): start clean.
      if (clerk.session) await clerk.signOut({ redirectUrl: window.location.href });
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: callback,
        redirectUrlComplete: callback,
      });
    })().catch((e) => setError(e instanceof Error ? e.message : "Couldn't open Google sign-in."));
  }, [id, isLoaded, signIn, clerk]);

  if (!id) return <NativeAuthShell title="This sign-in link isn't valid" body="Go back to the Daystrong app and tap “Continue with Google” again." />;
  if (error) return <NativeAuthShell title="Couldn't open Google" body={error} />;
  return <NativeAuthShell title="Opening Google…" body="You'll come back to the Daystrong app when you're done." spinner />;
}
