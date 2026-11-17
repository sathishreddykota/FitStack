import Link from "next/link";
import { ArrowRight, Footprints, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { fromDbDate, startOfWeek, toDbDate } from "@/server/dates";
import { formatPace } from "@/server/activity/geo";
import { RouteThumb } from "@/components/activity/route-thumb";
import { TYPE_LABEL, clock, dayLabel, km } from "@/lib/activity-format";

/** Dashboard: "This week: 14.2 km" plus the latest activity. */
export async function RunningTile({ userId, today, isPro }: { userId: string; today: string; isPro: boolean }) {
  const heading = (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-2 sm:flex-row sm:items-center">
      <h2 id="running-heading" className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        Running
      </h2>
      <Link href="/activity" className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-400)]">
        All activities <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );

  if (!isPro) {
    return (
      <section aria-labelledby="running-heading" className="pt-6">
        {heading}
        <Link href="/activity" className="flex items-center gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)]">
            <Lock className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-bold text-[var(--color-text-primary)]">Track runs with GPS</span>
            <span className="text-sm text-[var(--color-text-secondary)]">Distance, pace, route maps and personal bests — part of PRO.</span>
          </span>
        </Link>
      </section>
    );
  }

  const weekStart = startOfWeek(today);
  const [week, last] = await Promise.all([
    prisma.activity.aggregate({
      where: { userId, date: { gte: toDbDate(weekStart), lte: toDbDate(today) } },
      _sum: { distanceM: true, movingSec: true },
      _count: true,
    }),
    prisma.activity.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: { id: true, type: true, title: true, date: true, distanceM: true, movingSec: true, avgPaceSecPerKm: true, polyline: true },
    }),
  ]);
  const weekKm = km(week._sum.distanceM ?? 0, 1);

  return (
    <section aria-labelledby="running-heading" className="pt-6">
      {heading}
      <div className="theme-workout grid gap-3 rounded-3xl bg-[var(--color-surface-0)] p-3 text-[var(--color-text-primary)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Link href="/activity" className="fs-rise flex flex-col justify-between rounded-2xl bg-[var(--color-surface-1)] p-4">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--color-text-muted)]">This week</p>
          <p className="text-4xl font-black tabular-nums">
            {weekKm}
            <span className="ml-1 text-base font-bold text-[var(--color-text-muted)]">km</span>
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {week._count} {week._count === 1 ? "activity" : "activities"} · {clock(week._sum.movingSec ?? 0)}
          </p>
        </Link>
        {last ? (
          <Link href={`/activity/${last.id}`} className="fs-rise flex gap-4 rounded-2xl bg-[var(--color-surface-1)] p-3" style={{ ["--i" as string]: 1 }}>
            <RouteThumb polyline={last.polyline} className="h-20 w-20 shrink-0" />
            <div className="flex min-w-0 flex-col justify-center">
              <p className="text-xs text-[var(--color-text-muted)]">
                Last · {dayLabel(fromDbDate(last.date))} · {TYPE_LABEL[last.type]}
              </p>
              <p className="truncate font-bold">{last.title}</p>
              <p className="mt-1 flex gap-3 text-sm tabular-nums text-[var(--color-text-secondary)]">
                <span><b className="text-[var(--color-text-primary)]">{km(last.distanceM)}</b> km</span>
                <span>{clock(last.movingSec)}</span>
                <span>{formatPace(last.avgPaceSecPerKm)} /km</span>
              </p>
            </div>
          </Link>
        ) : (
          <Link href="/activity/record" className="fs-rise flex items-center gap-4 rounded-2xl bg-[var(--color-surface-1)] p-4" style={{ ["--i" as string]: 1 }}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-black">
              <Footprints className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-bold">Record your first run</span>
              <span className="text-sm text-[var(--color-text-secondary)]">Live GPS distance, pace and route.</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
