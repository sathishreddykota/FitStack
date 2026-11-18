"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bike, Footprints, Loader2, MapPin, Mountain, Pause, Play, Plus, Square, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatPace } from "@/server/activity/geo";
import { flushQueue, newClientId, pendingCount, queueUpload, type RecordType } from "@/lib/run-storage";
import { useRunRecorder, type GpsState } from "@/hooks/use-run-recorder";
import { openNativeSettings } from "@/lib/native-gps";

const RouteMap = dynamic(() => import("@/components/activity/route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[var(--color-surface-1)]" />,
});

const TYPES: { id: RecordType; label: string; icon: typeof Footprints }[] = [
  { id: "RUN", label: "Run", icon: Footprints },
  { id: "WALK", label: "Walk", icon: Footprints },
  { id: "HIKE", label: "Hike", icon: Mountain },
  { id: "RIDE", label: "Ride", icon: Bike },
];

const GPS_TEXT: Record<GpsState, string> = {
  off: "Location is off — turn it on in your phone's quick settings",
  searching: "Finding GPS…",
  weak: "Weak GPS — move to open sky",
  good: "GPS ready",
  denied: "Location blocked — allow it in your browser settings",
  unsupported: "This device has no GPS",
};

const BEST_LABEL: Record<number, string> = { 1000: "1 km", 5000: "5 km", 10000: "10 km", 21097: "Half marathon", 20000: "20 km", 40000: "40 km" };

function clock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
const km = (m: number) => (m / 1000).toFixed(2);

/** Smoothly animate a number towards `value` (the "numbers pop" feel). */
function useCountUp(value: number, ms = 900) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = dur ? Math.min(1, (t - start) / dur) : 1;
      const e = 1 - Math.pow(2, -10 * p);
      const v = a + (value - a) * (p === 1 ? 1 : e);
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

type Saved = {
  activity: { id: string; title: string; distanceM: number; movingSec: number; avgPaceSecPerKm: number | null; calories: number | null };
  newPRs: { distanceM: number; timeSec: number }[];
};

export default function RecordClient({ today, simulate }: { today: string; simulate: boolean }) {
  const router = useRouter();
  const r = useRunRecorder({ simulate });
  const [type, setType] = useState<RecordType>("RUN");
  const [stage, setStage] = useState<"live" | "save" | "saved">("live");
  const [title, setTitle] = useState("");
  // Same wording the server uses when the title is left empty.
  const [dayPart] = useState(() => {
    const h = new Date().getHours();
    return h < 5 ? "Night" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
  });
  const [feel, setFeel] = useState<number | null>(null);
  const [isPrivate, setIsPrivate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [pending, setPending] = useState(() => pendingCount());

  // Send any runs that were saved on the phone while offline.
  useEffect(() => {
    const flush = () =>
      flushQueue().then((n) => {
        if (n) toast.success(`${n} saved ${n === 1 ? "activity" : "activities"} uploaded`);
        setPending(pendingCount());
      });
    flush();
    addEventListener("online", flush);
    return () => removeEventListener("online", flush);
  }, []);

  const current = r.fix ? { lat: r.fix.lat, lng: r.fix.lng } : null;
  const tooShort = r.stats.distanceM < 50;

  const finish = () => {
    r.finish();
    setStage("save");
  };

  const save = async () => {
    const rec = r.rec;
    if (!rec) return;
    const body = {
      source: "GPS",
      type: rec.type,
      clientId: rec.clientId,
      points: rec.points,
      title: title.trim() || undefined,
      feel: feel ?? undefined,
      isPrivate,
    };
    setSaving(true);
    try {
      const res = await api<Saved>("/api/activities", { body });
      setSaved(res);
      setStage("saved");
      r.discard();
    } catch (err) {
      if (err instanceof ApiError && err.status !== 0 && err.status < 500) {
        toast.error(errorMessage(err));
      } else {
        // No signal: keep it on the phone and upload later.
        queueUpload({ clientId: rec.clientId, body, queuedAt: Date.now() });
        setPending(pendingCount());
        r.discard();
        toast.success("No connection — saved on this phone. It uploads automatically when you're back online.");
        setStage("live");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Saved: celebration ────────────────────────────────────────────
  if (stage === "saved" && saved) {
    return <SavedView saved={saved} onAgain={() => { setSaved(null); setTitle(""); setFeel(null); setStage("live"); }} onDone={() => router.push(`/activity/${saved.activity.id}`)} />;
  }

  // ── Save sheet ────────────────────────────────────────────────────
  if (stage === "save" && r.rec) {
    return (
      <div className="theme-workout -mx-4 -mt-6 min-h-[calc(100dvh-64px)] bg-[var(--color-surface-0)] px-4 pb-10 pt-6 text-[var(--color-text-primary)] sm:mx-0 sm:mt-0 sm:rounded-3xl sm:p-6">
        <div className="mx-auto flex max-w-lg flex-col gap-5">
          <h1 className="text-3xl font-black tracking-tight">Save your {TYPES.find((t) => t.id === r.rec!.type)?.label.toLowerCase()}</h1>
          <div className="h-56 overflow-hidden rounded-3xl border border-[var(--color-border)]">
            <RouteMap points={r.stats.points} interactive={false} className="h-full w-full" />
          </div>
          <StatRow distanceM={r.stats.distanceM} movingSec={r.stats.movingSec} paceSecPerKm={r.stats.paceSecPerKm} />

          {tooShort ? (
            <p className="rounded-2xl bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-text-secondary)]">
              This recording is under 50 m, so there&apos;s nothing to save. Discard it or go back and keep going.
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Title</span>
                <input
                  id="run-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder={`${dayPart} ${TYPES.find((t) => t.id === r.rec!.type)?.label ?? "Run"}`}
                  className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
                />
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-semibold">How did it feel?</legend>
                <div className="grid grid-cols-5 gap-2">
                  {["Hard", "Tough", "OK", "Good", "Great"].map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={feel === i + 1}
                      onClick={() => setFeel(feel === i + 1 ? null : i + 1)}
                      className={cn(
                        "h-12 rounded-xl border text-sm font-semibold transition-colors",
                        feel === i + 1
                          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)] text-black"
                          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="flex items-center justify-between rounded-2xl bg-[var(--color-surface-2)] p-4">
                <span>
                  <span className="block font-semibold">Only me</span>
                  <span className="text-sm text-[var(--color-text-muted)]">Your route and stats stay private</span>
                </span>
                <input id="run-private" type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-6 w-6 accent-[var(--color-brand-500)]" />
              </label>
            </>
          )}

          <div className="flex flex-col gap-3">
            {!tooShort && (
              <button
                onClick={save}
                disabled={saving}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-500)] text-base font-black uppercase tracking-widest text-black disabled:opacity-60"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                Save activity
              </button>
            )}
            <button
              onClick={() => { r.resume(); setStage("live"); }}
              className="h-12 rounded-2xl border border-[var(--color-border)] font-semibold text-[var(--color-text-primary)]"
            >
              Keep going
            </button>
            {confirmDiscard ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 p-3">
                <p className="flex-1 text-sm">Delete this recording? This can&apos;t be undone.</p>
                <button onClick={() => { r.discard(); setConfirmDiscard(false); setStage("live"); }} className="h-10 rounded-xl bg-[var(--color-error-500)] px-4 text-sm font-bold text-white">Delete</button>
                <button onClick={() => setConfirmDiscard(false)} className="h-10 rounded-xl px-3 text-sm font-semibold">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDiscard(true)} className="h-12 text-sm font-semibold text-[var(--color-error-400)]">Discard</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Live: start + recording ───────────────────────────────────────
  const recording = r.status !== "idle";
  const canStart = r.gps === "good" || r.gps === "weak";

  return (
    <div className="theme-workout -mx-4 -mt-6 flex min-h-[calc(100dvh-64px)] flex-col bg-[var(--color-surface-0)] text-[var(--color-text-primary)] sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-3xl">
      <div className="relative h-[42dvh] min-h-[240px] w-full">
        <RouteMap points={r.stats.points} live={recording} current={current} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-4">
          <span
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur",
              r.gps === "good" ? "bg-[#C8F560]/90 text-black" : r.gps === "denied" || r.gps === "unsupported" ? "bg-[var(--color-error-500)]/90 text-white" : "bg-black/70 text-white",
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            {simulate ? "Simulated GPS" : GPS_TEXT[r.gps]}
          </span>
          {r.status === "paused" && <span className="rounded-full bg-[#FFC24B] px-3 py-1.5 text-xs font-black uppercase tracking-widest text-black">Paused</span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 pb-8 pt-5">
        {!recording ? (
          <>
            <div role="radiogroup" aria-label="Activity type" className="grid grid-cols-4 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={type === t.id}
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-bold transition-all",
                    type === t.id ? "scale-[1.03] border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 text-[var(--color-brand-400)]" : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-muted)]",
                  )}
                >
                  <t.icon className="h-5 w-5" />
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => r.start(type)}
              disabled={!canStart}
              aria-label={`Start ${type.toLowerCase()}`}
              className="fs-start mx-auto mt-2 flex h-28 w-28 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-lg font-black uppercase tracking-widest text-black transition-transform active:scale-95 disabled:opacity-40"
            >
              Start
            </button>
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              {!canStart
                ? r.native
                  ? GPS_TEXT[r.gps].replace("browser settings", "app settings")
                  : GPS_TEXT[r.gps]
                : r.native
                  ? "You can lock your phone — FitStack keeps tracking and shows a notification."
                  : "Keep this screen open while you move — your phone's screen stays on."}
            </p>
            {r.native && r.gps === "denied" && (
              <button onClick={openNativeSettings} className="mx-auto h-11 rounded-full border border-[var(--color-border)] px-5 text-sm font-semibold">
                Open settings
              </button>
            )}

            <div className="mt-auto flex flex-col gap-3">
              {pending > 0 && (
                <p className="rounded-2xl bg-[var(--color-surface-2)] p-3 text-center text-sm text-[var(--color-text-secondary)]">
                  {pending} {pending === 1 ? "activity is" : "activities are"} waiting to upload — they&apos;ll send when you&apos;re online.
                </p>
              )}
              <button onClick={() => setManualOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] text-sm font-semibold">
                <Plus className="h-4 w-4" /> Add a treadmill or past activity
              </button>
            </div>
          </>
        ) : (
          <LivePanel
            elapsedSec={r.elapsedSec}
            distanceM={r.stats.distanceM}
            paceSecPerKm={r.stats.paceSecPerKm}
            currentPaceSecPerKm={r.stats.currentPaceSecPerKm}
            paused={r.status === "paused"}
            onPause={r.pause}
            onResume={r.resume}
            onFinish={finish}
          />
        )}
      </div>

      {manualOpen && <ManualSheet today={today} onClose={() => setManualOpen(false)} onSaved={(s) => { setManualOpen(false); setSaved(s); setStage("saved"); }} />}

      <style>{`
        .fs-start:not(:disabled){animation:fsStart 2.2s ease-out infinite}
        @keyframes fsStart{0%{box-shadow:0 0 0 0 rgba(255,107,44,.55)}100%{box-shadow:0 0 0 26px rgba(255,107,44,0)}}
        @media (prefers-reduced-motion:reduce){.fs-start{animation:none!important}}
      `}</style>
    </div>
  );
}

function LivePanel(p: {
  elapsedSec: number;
  distanceM: number;
  paceSecPerKm: number | null;
  currentPaceSecPerKm: number | null;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const dist = useCountUp(p.distanceM, 600);
  return (
    <>
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--color-text-muted)]">Time</p>
        <p className="font-mono text-6xl font-black tabular-nums tracking-tight" aria-live="off">{clock(p.elapsedSec)}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-[var(--color-surface-1)] p-3">
          <p className="text-3xl font-black tabular-nums">{km(dist)}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">km</p>
        </div>
        <div className="rounded-2xl bg-[var(--color-surface-1)] p-3">
          <p className="text-3xl font-black tabular-nums text-[var(--color-brand-400)]">{formatPace(p.currentPaceSecPerKm)}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">pace /km</p>
        </div>
        <div className="rounded-2xl bg-[var(--color-surface-1)] p-3">
          <p className="text-3xl font-black tabular-nums">{formatPace(p.paceSecPerKm)}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">avg /km</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-center gap-6">
        {p.paused ? (
          <>
            <button onClick={p.onResume} aria-label="Resume" className="flex h-24 w-24 items-center justify-center rounded-full bg-[#C8F560] text-black transition-transform active:scale-95">
              <Play className="h-10 w-10 fill-current" />
            </button>
            <button onClick={p.onFinish} aria-label="Finish" className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full bg-[var(--color-surface-2)] text-sm font-black uppercase tracking-widest">
              <Square className="h-7 w-7 fill-current" /> Finish
            </button>
          </>
        ) : (
          <button onClick={p.onPause} aria-label="Pause" className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-black transition-transform active:scale-95">
            <Pause className="h-12 w-12 fill-current" />
          </button>
        )}
      </div>
    </>
  );
}

function StatRow({ distanceM, movingSec, paceSecPerKm }: { distanceM: number; movingSec: number; paceSecPerKm: number | null }) {
  const d = useCountUp(distanceM);
  const t = useCountUp(movingSec);
  return (
    <div className="grid grid-cols-3 gap-3 text-center">
      {[
        [km(d), "km"],
        [clock(Math.round(t)), "moving time"],
        [formatPace(paceSecPerKm), "avg pace /km"],
      ].map(([v, l]) => (
        <div key={l} className="rounded-2xl bg-[var(--color-surface-1)] p-3">
          <p className="text-2xl font-black tabular-nums">{v}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{l}</p>
        </div>
      ))}
    </div>
  );
}

function SavedView({ saved, onAgain, onDone }: { saved: Saved; onAgain: () => void; onDone: () => void }) {
  const a = saved.activity;
  const pr = saved.newPRs.length > 0;
  return (
    <div className="theme-workout relative -mx-4 -mt-6 flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center gap-6 overflow-hidden bg-[var(--color-surface-0)] px-6 py-10 text-center text-[var(--color-text-primary)] sm:mx-0 sm:mt-0 sm:rounded-3xl">
      {pr && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="fs-conf" style={{ left: `${6 + i * 6.5}%`, background: ["#FF6B2C", "#C8F560", "#FFC24B", "#9B8CFF", "#FF7A6B"][i % 5], animationDelay: `${(i % 5) * 0.06}s`, ["--x" as string]: `${(i % 2 ? 1 : -1) * (8 + i * 2)}px` }} />
          ))}
        </div>
      )}
      <span className={cn("fs-badge flex h-20 w-20 items-center justify-center rounded-full", pr ? "bg-[#C8F560] text-black" : "bg-[var(--color-brand-500)] text-black")}>
        {pr ? <Trophy className="h-10 w-10" /> : <Footprints className="h-10 w-10" />}
      </span>
      <div>
        <h1 className="text-3xl font-black tracking-tight">{pr ? "New personal best!" : "Activity saved"}</h1>
        <p className="mt-1 text-[var(--color-text-secondary)]">{a.title}</p>
      </div>
      <div className="w-full max-w-md">
        <StatRow distanceM={a.distanceM} movingSec={a.movingSec} paceSecPerKm={a.avgPaceSecPerKm} />
      </div>
      {pr && (
        <ul className="flex w-full max-w-md flex-col gap-2">
          {saved.newPRs.map((p) => (
            <li key={p.distanceM} className="flex items-center justify-between rounded-2xl border border-[#47561C] bg-[#1A2010] px-4 py-3">
              <span className="font-semibold text-[#E6FFAD]">Fastest {BEST_LABEL[p.distanceM] ?? `${p.distanceM / 1000} km`}</span>
              <span className="font-mono font-bold tabular-nums">{clock(p.timeSec)}</span>
            </li>
          ))}
        </ul>
      )}
      {a.calories ? <p className="text-sm text-[var(--color-text-muted)]">≈ {a.calories} kcal burned</p> : null}
      <div className="flex w-full max-w-md flex-col gap-3">
        <button onClick={onDone} className="h-14 rounded-2xl bg-[var(--color-brand-500)] font-black uppercase tracking-widest text-black">See splits &amp; details</button>
        <button onClick={onAgain} className="h-12 rounded-2xl border border-[var(--color-border)] font-semibold">Record another</button>
      </div>
      <style>{`
        .fs-badge{animation:fsBadge .8s cubic-bezier(.34,1.56,.64,1) both}
        @keyframes fsBadge{from{transform:scale(.2) rotate(-20deg);opacity:0}60%{transform:scale(1.15) rotate(6deg);opacity:1}to{transform:none}}
        .fs-conf{position:absolute;top:0;width:8px;height:12px;border-radius:2px;opacity:0;animation:fsConf 1.9s cubic-bezier(.25,.6,.4,1) .2s both}
        @keyframes fsConf{0%{opacity:0;transform:translate(0,-10px) rotate(0)}10%{opacity:1}100%{opacity:0;transform:translate(var(--x),230px) rotate(400deg)}}
        @media (prefers-reduced-motion:reduce){.fs-badge,.fs-conf{animation:none}.fs-conf{display:none}}
      `}</style>
    </div>
  );
}

function ManualSheet({ today, onClose, onSaved }: { today: string; onClose: () => void; onSaved: (s: Saved) => void }) {
  const [type, setType] = useState<"RUN" | "TREADMILL" | "WALK" | "HIKE" | "RIDE">("TREADMILL");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("07:00");
  const [kmStr, setKmStr] = useState("5");
  const [h, setH] = useState("0");
  const [m, setM] = useState("30");
  const [s, setS] = useState("0");
  const [busy, setBusy] = useState(false);
  // One id per open form, so a double tap or retry can't save twice.
  const clientId = useRef<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const distanceM = Math.round(parseFloat(kmStr) * 1000);
    const durationSec = (+h || 0) * 3600 + (+m || 0) * 60 + (+s || 0);
    if (!(distanceM >= 10)) return toast.error("Enter a distance.");
    if (durationSec < 30) return toast.error("Enter how long it took.");
    setBusy(true);
    clientId.current ??= newClientId();
    try {
      onSaved(await api<Saved>("/api/activities", { body: { source: "MANUAL", type, date, startTime: time, distanceM, durationSec, clientId: clientId.current, isPrivate: true } }));
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  const input = "h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="theme-workout flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-[var(--color-surface-1)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[var(--color-text-primary)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Add an activity</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"><X className="h-5 w-5" /></button>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Type
          <select id="manual-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={input}>
            <option value="TREADMILL">Treadmill run</option><option value="RUN">Run</option><option value="WALK">Walk</option><option value="HIKE">Hike</option><option value="RIDE">Ride</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Date<input id="manual-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Start<input id="manual-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} /></label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Distance (km)<input id="manual-km" type="number" inputMode="decimal" step="0.01" min="0.01" value={kmStr} onChange={(e) => setKmStr(e.target.value)} className={input} /></label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Time</legend>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-[var(--color-text-muted)]">Hours<input id="manual-h" type="number" min="0" max="23" value={h} onChange={(e) => setH(e.target.value)} className={input} /></label>
            <label className="text-xs text-[var(--color-text-muted)]">Minutes<input id="manual-m" type="number" min="0" max="59" value={m} onChange={(e) => setM(e.target.value)} className={input} /></label>
            <label className="text-xs text-[var(--color-text-muted)]">Seconds<input id="manual-s" type="number" min="0" max="59" value={s} onChange={(e) => setS(e.target.value)} className={input} /></label>
          </div>
        </fieldset>
        <button type="submit" disabled={busy} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-500)] font-black uppercase tracking-widest text-black disabled:opacity-60">
          {busy && <Loader2 className="h-5 w-5 animate-spin" />} Save
        </button>
        <Link href="/activity/record" onClick={onClose} className="sr-only">Back to recording</Link>
      </form>
    </div>
  );
}
