import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Mountain, Trophy, Zap } from "lucide-react";
import { requireOnboardedUser, timezoneOf } from "@/server/auth";
import { getActivity } from "@/server/activity/service";
import { decodePolyline, formatPace } from "@/server/activity/geo";
import { HttpError } from "@/server/http";
import { PremiumGate } from "@/components/shared/premium-gate";
import { BEST_LABEL, FEEL_LABEL, TYPE_LABEL, clock, dayLabel, km } from "@/lib/activity-format";
import { DetailMap } from "./detail-map";
import { ActivityActions } from "./activity-actions";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PremiumGate title="Track runs, walks and rides" description="Route maps, km splits and personal bests are part of Daystrong PRO.">
      <Detail id={id} />
    </PremiumGate>
  );
}

async function Detail({ id }: { id: string }) {
  const user = await requireOnboardedUser();
  let a: Awaited<ReturnType<typeof getActivity>>;
  try {
    a = await getActivity(user.id, id);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  }

  const route = a.polyline ? decodePolyline(a.polyline) : [];
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: timezoneOf(user) }).format(a.startedAt);
  const pausedSec = Math.max(0, a.elapsedSec - a.movingSec);

  // Splits: pace per km (the last one may be partial — scale it to a per-km pace).
  const splits = a.splits.map((s) => ({ ...s, pace: s.distanceM > 0 ? s.movingSec / (s.distanceM / 1000) : 0 }));
  const full = splits.filter((s) => s.distanceM >= 900);
  const fastest = full.length > 1 ? full.reduce((b, s) => (s.pace < b.pace ? s : b)) : null;
  const slowestPace = Math.max(...splits.map((s) => s.pace), 1);
  const fastestPace = Math.min(...splits.map((s) => s.pace).filter(Boolean), slowestPace);

  // Elevation profile from each split's climb/descent.
  const elev = [0];
  for (const s of a.splits) elev.push(elev[elev.length - 1] + (s.elevDeltaM ?? 0));
  const hasElev = a.splits.some((s) => s.elevDeltaM != null && Math.abs(s.elevDeltaM) >= 1);

  const prs = a.bestEfforts.filter((b) => b.isPR);
  const efforts = a.bestEfforts;

  const stats: [string, string][] = [
    [km(a.distanceM), "km"],
    [clock(a.movingSec), "moving time"],
    [formatPace(a.avgPaceSecPerKm), "avg pace /km"],
    [a.elevationGainM != null ? `${Math.round(a.elevationGainM)} m` : "—", "elevation gain"],
    [a.calories != null ? String(a.calories) : "—", "kcal"],
    [a.maxSpeedMps ? `${(a.maxSpeedMps * 3.6).toFixed(1)}` : "—", "max km/h"],
  ];

  return (
    <div className="theme-workout -mx-4 -mt-6 min-h-[calc(100dvh-64px)] bg-[var(--color-surface-0)] pb-16 text-[var(--color-text-primary)] sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-3xl">
      <div className="relative">
        {route.length > 1 ? (
          <DetailMap points={route} />
        ) : (
          <div className="h-24" />
        )}
        <Link
          href="/activity"
          aria-label="Back to activities"
          className="absolute left-4 top-4 z-[500] flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-5 sm:px-6">
        <header>
          <p className="text-sm text-[var(--color-text-muted)]">
            {dayLabel(a.day, true)} · {time} · {TYPE_LABEL[a.type]}
            {a.source === "MANUAL" && " · added manually"}
          </p>
          <h1 className="fs-rise text-3xl font-black tracking-tight">{a.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            {a.isPrivate && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-text-secondary)]">
                <Lock className="h-3 w-3" /> Only me
              </span>
            )}
            {a.feel && <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-text-secondary)]">Felt {FEEL_LABEL[a.feel - 1].toLowerCase()}</span>}
            {pausedSec >= 60 && (
              <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-text-secondary)]">
                {clock(a.elapsedSec)} total · {clock(pausedSec)} stopped
              </span>
            )}
          </div>
          {a.notes && <p className="mt-3 whitespace-pre-line text-[var(--color-text-secondary)]">{a.notes}</p>}
        </header>

        <div className="grid grid-cols-3 gap-3">
          {stats.map(([v, l], i) => (
            <div key={l} className="fs-rise rounded-2xl bg-[var(--color-surface-1)] p-3" style={{ ["--i" as string]: i }}>
              <p className="text-2xl font-black tabular-nums">{v}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{l}</p>
            </div>
          ))}
        </div>

        {prs.length > 0 && (
          <section aria-label="New personal bests" className="flex flex-col gap-2">
            {prs.map((p) => (
              <div key={p.id} className="fs-rise flex items-center justify-between rounded-2xl border border-[#47561C] bg-[#1A2010] px-4 py-3">
                <span className="flex items-center gap-2 font-semibold text-[#E6FFAD]">
                  <Trophy className="h-4 w-4" /> Personal best · {BEST_LABEL[p.distanceM] ?? `${km(p.distanceM, 0)} km`}
                </span>
                <span className="font-mono font-bold tabular-nums">{clock(p.timeSec)}</span>
              </div>
            ))}
          </section>
        )}

        {splits.length > 0 && (
          <section aria-labelledby="splits-h" className="rounded-3xl bg-[var(--color-surface-1)] p-5">
            <h2 id="splits-h" className="mb-4 font-bold">Splits</h2>
            <table className="w-full text-sm tabular-nums">
              <thead className="sr-only">
                <tr><th>Km</th><th>Pace</th><th>Elevation</th></tr>
              </thead>
              <tbody>
                {splits.map((s, i) => {
                  // Faster = longer bar; keep even the slowest visible.
                  const span = slowestPace - fastestPace;
                  const w = span > 0 ? 35 + 65 * ((slowestPace - s.pace) / span) : 100;
                  const isFastest = fastest?.id === s.id;
                  return (
                    <tr key={s.id}>
                      <td className="w-12 py-1.5 pr-2 font-semibold text-[var(--color-text-muted)]">
                        {s.distanceM >= 900 ? s.index + 1 : km(s.distanceM)}
                      </td>
                      <td className="w-14 py-1.5 pr-3 font-bold">{formatPace(Math.round(s.pace))}</td>
                      <td className="py-1.5">
                        <div
                          className={`fs-grow-x h-6 rounded-md ${isFastest ? "fs-glow bg-[#C8F560]" : "bg-[var(--color-brand-500)]/70"}`}
                          style={{ width: `${w}%`, ["--i" as string]: i }}
                        >
                          {isFastest && <Zap className="ml-1.5 h-6 w-3.5 text-black" aria-label="Fastest km" />}
                        </div>
                      </td>
                      <td className="w-14 py-1.5 pl-2 text-right text-xs text-[var(--color-text-muted)]">
                        {s.elevDeltaM != null ? `${s.elevDeltaM > 0 ? "+" : ""}${Math.round(s.elevDeltaM)} m` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {hasElev && <ElevationChart values={elev} distanceM={a.distanceM} />}

        {efforts.length > 0 && (
          <section aria-labelledby="efforts-h" className="rounded-3xl bg-[var(--color-surface-1)] p-5">
            <h2 id="efforts-h" className="mb-3 font-bold">Best efforts in this {TYPE_LABEL[a.type].toLowerCase()}</h2>
            <ul className="divide-y divide-[var(--color-border)]">
              {efforts.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-semibold">{BEST_LABEL[b.distanceM] ?? `${km(b.distanceM, 0)} km`}</span>
                  <span className="flex items-center gap-2 font-mono tabular-nums">
                    {b.isPR && <Trophy className="h-4 w-4 text-[#C8F560]" aria-label="Personal best" />}
                    {clock(b.timeSec)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ActivityActions id={a.id} title={a.title} notes={a.notes} isPrivate={a.isPrivate} />
      </div>
    </div>
  );
}

function ElevationChart({ values, distanceM }: { values: number[]; distanceM: number }) {
  const W = 320;
  const H = 90;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 10);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 8 - ((v - min) / span) * (H - 16)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  return (
    <section aria-labelledby="elev-h" className="rounded-3xl bg-[var(--color-surface-1)] p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="elev-h" className="flex items-center gap-2 font-bold"><Mountain className="h-4 w-4 text-[#9B8CFF]" /> Elevation</h2>
        <p className="text-xs text-[var(--color-text-muted)]">{Math.round(max - min)} m range over {km(distanceM, 1)} km</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" preserveAspectRatio="none" role="img" aria-label="Elevation profile">
        <defs>
          <linearGradient id="elevFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#9B8CFF" stopOpacity=".45" />
            <stop offset="1" stopColor="#9B8CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line}L${W} ${H}L0 ${H}Z`} fill="url(#elevFill)" className="fs-rise" />
        <path d={line} fill="none" stroke="#9B8CFF" strokeWidth="2.5" vectorEffect="non-scaling-stroke" pathLength={1} className="fs-draw" />
      </svg>
    </section>
  );
}
