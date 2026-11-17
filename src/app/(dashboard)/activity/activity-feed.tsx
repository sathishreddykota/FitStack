"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Trophy } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatPace } from "@/server/activity/geo";
import { TYPE_LABEL, clock, dayLabel, km, type ActivityTypeId } from "@/lib/activity-format";
import { RouteThumb } from "@/components/activity/route-thumb";

export interface FeedItem {
  id: string;
  type: ActivityTypeId;
  source: string;
  title: string;
  day: string;
  startedAt: string;
  distanceM: number;
  movingSec: number;
  avgPaceSecPerKm: number | null;
  calories: number | null;
  polyline: string | null;
  prCount: number;
}

const FILTERS: { id: ActivityTypeId | null; label: string }[] = [
  { id: null, label: "All" },
  { id: "RUN", label: "Runs" },
  { id: "WALK", label: "Walks" },
  { id: "HIKE", label: "Hikes" },
  { id: "RIDE", label: "Rides" },
  { id: "TREADMILL", label: "Treadmill" },
];

export function ActivityFeed({ initial, initialCursor }: { initial: FeedItem[]; initialCursor: string | null }) {
  const [filter, setFilter] = useState<ActivityTypeId | null>(null);
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const req = useRef(0);

  const load = async (type: ActivityTypeId | null, after: string | null) => {
    const id = ++req.current;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (type) qs.set("type", type);
      if (after) qs.set("cursor", after);
      const res = await api<{ items: FeedItem[]; nextCursor: string | null }>(`/api/activities?${qs}`);
      if (id !== req.current) return; // a newer filter won
      setItems((prev) => (after ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor);
    } catch (err) {
      if (id === req.current) setError(errorMessage(err));
    } finally {
      if (id === req.current) setLoading(false);
    }
  };

  const pick = (type: ActivityTypeId | null) => {
    if (type === filter) return;
    setFilter(type);
    if (type === null) {
      // The first page of "All" is already here.
      req.current++;
      setItems(initial);
      setCursor(initialCursor);
      setLoading(false);
      setError(null);
    } else {
      setItems([]);
      load(type, null);
    }
  };

  return (
    <section aria-labelledby="feed-h" className="flex flex-col gap-3">
      <h2 id="feed-h" className="font-bold">Your activities</h2>
      <div role="tablist" aria-label="Filter by type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => pick(f.id)}
            className={cn(
              "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
              filter === f.id
                ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)] text-black"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 && !loading && !error && (
        <div className="rounded-3xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="font-semibold">{filter ? `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} yet` : "No activities yet"}</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Record a run or walk and it shows up here with its route and splits.</p>
          <Link href="/activity/record" className="mt-4 inline-flex h-11 items-center rounded-full bg-[var(--color-brand-500)] px-5 text-sm font-bold text-black">
            Record your first
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((a, i) => (
          <li key={a.id} className="fs-rise" style={{ ["--i" as string]: Math.min(i, 8) }}>
            <Link href={`/activity/${a.id}`} className="flex gap-4 rounded-3xl bg-[var(--color-surface-1)] p-3 transition-colors hover:bg-[var(--color-surface-2)]">
              <RouteThumb polyline={a.polyline} className="h-20 w-20 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {dayLabel(a.day)} · {TYPE_LABEL[a.type]}
                </p>
                <p className="flex items-center gap-2 truncate font-bold">
                  <span className="truncate">{a.title}</span>
                  {a.prCount > 0 && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#C8F560] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                      <Trophy className="h-3 w-3" /> PR
                    </span>
                  )}
                </p>
                <div className="mt-1 flex gap-4 text-sm tabular-nums">
                  <span><b className="text-base">{km(a.distanceM)}</b> km</span>
                  <span className="text-[var(--color-text-secondary)]">{clock(a.movingSec)}</span>
                  <span className="text-[var(--color-text-secondary)]">{formatPace(a.avgPaceSecPerKm)} /km</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-500/10 p-3 text-center text-sm text-red-300">
          {error}{" "}
          <button className="font-bold underline" onClick={() => load(filter, items.length ? cursor : null)}>Try again</button>
        </p>
      )}
      {loading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--color-text-muted)]" aria-label="Loading" />}
      {cursor && !loading && !error && (
        <button onClick={() => load(filter, cursor)} className="h-12 rounded-2xl border border-[var(--color-border)] text-sm font-semibold">
          Show more
        </button>
      )}
    </section>
  );
}
