"use client";

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────
// Ember Night motion rule 1: numbers count up to their value.
// Counts from the previous value (so a change animates only the difference),
// eases out, finishes in `ms` (default 550 ms). With "reduce motion" on, or
// during server render, it simply shows the value.
// ─────────────────────────────────────────────

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function CountUp({
  value,
  decimals = 0,
  ms = 550,
  format,
  className,
}: {
  value: number;
  decimals?: number;
  ms?: number;
  /** Custom formatting, e.g. (n) => n.toLocaleString("en-IN"). */
  format?: (n: number) => string;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(0); // first render counts up from zero
  const shownRef = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (reduced() || start === value) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const t0 = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 4);
      const v = start + (value - start) * eased;
      shownRef.current = v;
      setShown(v);
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      from.current = shownRef.current; // interrupted: continue from where it was
    };
  }, [value, ms]);

  const n = Number(shown.toFixed(decimals));
  return <span className={className ? `num ${className}` : "num"}>{format ? format(n) : n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}
