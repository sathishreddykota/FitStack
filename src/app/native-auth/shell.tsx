import type { ReactNode } from "react";

/** Plain full-screen message for the sign-in browser tab. */
export function NativeAuthShell({ title, body, spinner, children }: { title: string; body: string; spinner?: boolean; children?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--color-surface-0)] px-6 text-center">
      {spinner && <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand-500)]" aria-hidden />}
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{body}</p>
      {children}
    </main>
  );
}
