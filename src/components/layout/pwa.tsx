"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "fitstack-install-dismissed";

/** Registers the service worker and offers "Install app" on Android/desktop Chrome. */
export function PwaSupport() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* non-critical */
      });
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        /* storage blocked */
      }
      if (!dismissed) setPromptEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!promptEvent) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage blocked */
    }
    setPromptEvent(null);
  };

  return (
    <div className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-xl">
      <Download className="h-5 w-5 shrink-0 text-[var(--color-brand-400)]" />
      <p className="flex-1 text-sm text-[var(--color-text-primary)]">Install Daystrong for one-tap logging.</p>
      <button
        onClick={async () => {
          await promptEvent.prompt();
          await promptEvent.userChoice;
          setPromptEvent(null);
        }}
        className="rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-sm font-bold text-[var(--color-on-brand)]"
      >
        Install
      </button>
      <button onClick={dismiss} aria-label="Dismiss" className="text-[var(--color-text-muted)]">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
