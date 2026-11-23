import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Footprints, Timer, Trophy } from "lucide-react";
import { requireOnboardedUser, todayOf } from "@/server/auth";
import { activityStats, listActivities } from "@/server/activity/service";
import { PremiumGate } from "@/components/shared/premium-gate";
import { BEST_LABEL, TYPE_LABEL, clock, dayLabel, km, type ActivityTypeId } from "@/lib/activity-format";
import { ActivityFeed, type FeedItem } from "./activity-feed";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <PremiumGate
      title="Track runs, walks and rides"
      description="Live GPS distance, pace and route maps, km splits and automatic personal bests."
      perks={["Live distance, pace and route map", "Splits for every kilometre", "Personal bests: 1K, 5K, 10K, half", "Your coach reads your runs"]}
    >
      <ActivityHome />
    </PremiumGate>
  );
}

async function ActivityHome() {
  const user = await requireOnboardedUser();
  const today = todayOf(user).str;
  const [stats, first] = await Promise.all([activityStats(user.id, today), listActivities(user.id, { limit: 20 })]);

  const items: FeedItem[] = first.items.map((a) => ({
    id: a.id,
    type: a.type,
    source: a.source,
    title: a.title,
    day: a.day,
    startedAt: a.startedAt.toISOString(),
    distanceM: a.distanceM,
    movingSec: a.movingSec,
    avgPaceSecPerKm: a.avgPaceSecPerKm,
    calories: a.calories,
    polyline: a.polyline,
    prCount: a.prCount,
  }));

  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.distanceM));
  const w = stats.week;

  return (
    <div className="theme-workout -mx-4 -mt-6 min-h-[calc(100dvh-64px)] bg-[var(--color-surface-0)] px-4 pb-16 pt-6 text-[var(--color-text-primary)] sm:mx-0 sm:mt-0 sm:rounded-3xl sm:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--color-text-muted)]">This week</p>
            <h1 className="fs-rise text-5xl font-black tabular-nums tracking-tight">
              {km(w.distanceM, 1)}
              <span className="ml-1 text-xl font-bold text-[var(--color-text-muted)]">km</span>
            </h1>
          </div>
          <Link
            href="/activity/record"
            className="flex h-12 items-center gap-2 rounded-full bg-[var(--color-brand-500)] px-5 text-sm font-black uppercase tracking-widest text-black transition-transform active:scale-95"
          >
            <Footprints className="h-4 w-4" /> Record
          </Link>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Footprints, v: String(w.count), l: w.count === 1 ? "activity" : "activities" },
            { icon: Timer, v: clock(w.movingSec), l: "moving time" },
            { icon: Flame, v: String(Math.round(w.calories)), l: "kcal" },
          ].map((s, i) => (
            <div key={s.l} className="fs-rise rounded-2xl bg-[var(--color-surface-1)] p-3" style={{ ["--i" as string]: i + 1 }}>
              <s.icon className="mb-1 h-4 w-4 text-[var(--color-brand-400)]" />
              <p className="text-2xl font-black tabular-nums">{s.v}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Last 12 weeks */}
        <section aria-labelledby="weeks-h" className="rounded-3xl bg-[var(--color-surface-1)] p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="weeks-h" className="font-bold">Last 12 weeks</h2>
            <p className="text-xs text-[var(--color-text-muted)]">km per week</p>
          </div>
          <div className="flex h-32 items-end gap-1.5" role="img" aria-label={`Weekly distance: ${stats.weeks.map((x) => `${km(x.distanceM, 1)} km`).join(", ")}`}>
            {stats.weeks.map((wk, i) => {
              const current = i === stats.weeks.length - 1;
              return (
                <div key={wk.weekStart} className="flex h-full flex-1 flex-col justify-end">
                  <div
                    className={`fs-grow-y w-full rounded-t-md ${current ? "bg-[var(--color-brand-500)]" : wk.distanceM ? "bg-[var(--color-brand-500)]/35" : "bg-[var(--color-surface-3)]"}`}
                    style={{ height: `${Math.max(4, (wk.distanceM / maxWeek) * 100)}%`, ["--i" as string]: i }}
                    title={`${dayLabel(wk.weekStart)}: ${km(wk.distanceM, 1)} km`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <span>{dayLabel(stats.weeks[0].weekStart)}</span>
            <span>This week</span>
          </div>
        </section>

        {/* Personal bests */}
        {(stats.personalBests.length > 0 || stats.longestRun) && (
          <section aria-labelledby="pb-h">
            <h2 id="pb-h" className="mb-3 flex items-center gap-2 font-bold">
              <Trophy className="h-4 w-4 text-[#C8F560]" /> Personal bests
            </h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {stats.personalBests.map((p, i) => (
                <Link
                  key={`${p.type}-${p.distanceM}`}
                  href={`/activity/${p.activityId}`}
                  className="fs-rise min-w-[132px] rounded-2xl border border-[#47561C] bg-[#1A2010] p-3"
                  style={{ ["--i" as string]: i }}
                >
                  <p className="text-xs font-semibold text-[#E6FFAD]">
                    {BEST_LABEL[p.distanceM] ?? `${km(p.distanceM, 0)} km`} · {TYPE_LABEL[p.type as ActivityTypeId]}
                  </p>
                  <p className="font-mono text-xl font-black tabular-nums">{clock(p.timeSec)}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{dayLabel(p.day)}</p>
                </Link>
              ))}
              {stats.longestRun && (
                <Link href={`/activity/${stats.longestRun.id}`} className="fs-rise min-w-[132px] rounded-2xl bg-[var(--color-surface-1)] p-3">
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Longest run</p>
                  <p className="text-xl font-black tabular-nums">{km(stats.longestRun.distanceM)} km</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{dayLabel(stats.longestRun.day)}</p>
                </Link>
              )}
            </div>
          </section>
        )}

        <ActivityFeed initial={items} initialCursor={first.nextCursor} />
      </div>
    </div>
  );
}
