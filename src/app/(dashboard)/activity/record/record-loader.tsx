"use client";

import dynamic from "next/dynamic";

// The recorder reads GPS and on-device storage from its first render,
// so it only ever renders in the browser.
export const RecordLoader = dynamic(() => import("./record-client"), {
  ssr: false,
  loading: () => <div className="min-h-[60dvh] animate-pulse rounded-3xl bg-[var(--color-surface-1)]" />,
});
