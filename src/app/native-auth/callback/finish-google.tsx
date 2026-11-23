"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { NativeAuthShell } from "../shell";
import { appLink, completeAndReturn } from "../hand-back";

/** How long to wait for Clerk to report the session after Google. */
const SESSION_WAIT_MS = 12_000;

const report = (stage: string, detail: string) =>
  fetch("/api/native-auth/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage, detail: detail.slice(0, 300) }),
  }).catch(() => {});

/**
 * Finishes Google sign-in in the browser tab, with every next step on OUR site:
 *  - already signed in (Clerk completed it on the way back) → /native-auth/done
 *  - sign-in/sign-up to finish                                → finish it → /native-auth/done
 *  - new account needs one more detail                        → /native-auth/continue (ours)
 * Clerk is never allowed to move the tab to its hosted pages or back to /sign-in.
 */
export function FinishGoogle({ id }: { id: string | null }) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const ran = useRef(false);
  const finished = useRef(false); // complete + open the app at most once
  const [error, setError] = useState<string | null>(null);
  const [returned, setReturned] = useState(false);

  useEffect(() => {
    if (!id || !isLoaded || ran.current) return;
    ran.current = true;
    const origin = window.location.origin;
    const done = `${origin}/native-auth/done?id=${id}`;
    // Finish here, on this page, while the session is certainly available.
    const finish = () => {
      const session = clerk.session;
      if (!session) return Promise.resolve(false);
      if (finished.current) return Promise.resolve(true);
      finished.current = true;
      return completeAndReturn(session, id)
        .then(() => {
          setReturned(true);
          return true;
        })
        .catch((e: unknown) => {
          void report("complete-failed", e instanceof Error ? e.message : String(e));
          setError("Couldn't hand the sign-in back to the app.");
          return true;
        });
    };
    const cont = `${origin}/native-auth/continue?id=${id}#/continue`;

    // Existing account: Clerk already finished the sign-in before sending us here.
    if (isSignedIn) {
      void finish();
      return;
    }

    const waitForSession = async (why: string) => {
      const t0 = Date.now();
      while (Date.now() - t0 < SESSION_WAIT_MS) {
        if (clerk.session) return void finish();
        await new Promise((r) => setTimeout(r, 300));
      }
      const status = `signIn=${clerk.client?.signIn?.status ?? "none"} signUp=${clerk.client?.signUp?.status ?? "none"} missing=${clerk.client?.signUp?.missingFields?.join(",") ?? ""}`;
      void report("no-session", `${why} | ${status}`);
      setError("Google sign-in didn't come back to Daystrong.");
    };

    clerk
      .handleRedirectCallback(
        {
          signInForceRedirectUrl: done,
          signUpForceRedirectUrl: done,
          continueSignUpUrl: cont,
          signInUrl: `${origin}/sign-in`,
          signUpUrl: `${origin}/sign-up`,
          transferable: true,
        },
        async (to: string) => {
          const url = new URL(to, origin);
          const path = url.pathname;
          if (url.origin === origin && path.startsWith("/native-auth/done")) {
            // Signed in: finish on this page instead of loading another one.
            if (await finish()) return;
            return waitForSession("done without session");
          }
          if (url.origin === origin && path.startsWith("/native-auth/continue")) {
            return window.location.assign(url.href);
          }
          // Clerk wanted to go elsewhere (its hosted pages, or /sign-in): stay and wait for the session.
          void report("redirect-held", `${url.origin === origin ? "" : url.host}${path}`);
          await waitForSession(`wanted ${url.origin === origin ? path : url.host}`);
        },
      )
      .then(() => {
        // Resolved without navigating: the session may just need a moment.
        if (finished.current) return;
        if (!clerk.session) return waitForSession("resolved without redirect");
        void finish();
      })
      .catch((e: unknown) => {
        const msg = (e as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0];
        const text = msg?.longMessage ?? msg?.message ?? (e instanceof Error ? e.message : "unknown error");
        void report("callback-error", text);
        if (clerk.session) return void finish();
        setError(text);
      });
  }, [id, isLoaded, isSignedIn, clerk]);

  if (!id) return <NativeAuthShell title="This sign-in link isn't valid" body="Go back to the Daystrong app and tap “Continue with Google” again." />;
  if (error) return <NativeAuthShell title="Sign-in didn't finish" body={`${error} Go back to the Daystrong app and try again.`} />;
  if (returned) {
    return (
      <NativeAuthShell title="You're signed in ✓" body="Taking you back to the Daystrong app…">
        <a href={appLink(id)} className="mt-2 rounded-full bg-[var(--color-brand-500)] px-6 py-3 font-bold text-[var(--color-on-brand)]">
          Open Daystrong
        </a>
      </NativeAuthShell>
    );
  }
  return <NativeAuthShell title="Signing you in…" body="Just a moment." spinner />;
}
