import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };
export const dynamic = "force-static";

// Shown by the service worker when a page can't load without a connection.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--color-surface-0)] p-8 text-center">
      <p className="text-5xl" aria-hidden>
        📶
      </p>
      <h1 className="text-2xl font-black text-[var(--color-text-primary)]">You&apos;re offline</h1>
      <p className="max-w-sm text-[var(--color-text-secondary)]">
        Daystrong needs a connection to load your data. Your logs are safe — reconnect and try again.
      </p>
      <a href="/dashboard" className="rounded-full bg-[var(--color-brand-500)] px-6 py-3 font-bold text-[var(--color-on-brand)]">
        Try again
      </a>
    </main>
  );
}
