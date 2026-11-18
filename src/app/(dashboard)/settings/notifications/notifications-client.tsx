"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Bell, BellOff, Moon, Smartphone, Send } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { askForPush, pushAvailable, pushPermission } from "@/lib/native-push";
import { openNativeSettings } from "@/lib/native-gps";

interface Prefs {
  enabled: boolean;
  mealReminders: boolean;
  goalReminders: boolean;
  achievements: boolean;
  morningRecap: boolean;
  breakfastAt: string;
  lunchAt: string;
  dinnerAt: string;
  summaryAt: string;
  recapAt: string;
  quietStart: string;
  quietEnd: string;
}

type TimeKey = "breakfastAt" | "lunchAt" | "dinnerAt" | "summaryAt" | "recapAt" | "quietStart" | "quietEnd";
type Permission = "granted" | "prompt" | "denied";

const noSubscribe = () => () => {};

export function NotificationsClient({ initial, phones, serverReady }: { initial: Prefs; phones: number; serverReady: boolean }) {
  const [prefs, setPrefs] = useState(initial);
  // Times are edited locally and saved when the field loses focus (no request per keystroke).
  const [draft, setDraft] = useState<Record<TimeKey, string>>(() => pick(initial));
  // Server render (and plain browsers) say "not the app"; the Android app says "app" once hydrated.
  const native = useSyncExternalStore(noSubscribe, pushAvailable, () => false);
  const [perm, setPerm] = useState<Permission | null>(null);
  const phone = !native ? "web" : (perm ?? "checking");
  const [phoneCount, setPhoneCount] = useState(phones);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!native) return;
    pushPermission()
      .then((p) => setPerm(p === "granted" ? "granted" : p === "denied" ? "denied" : "prompt"))
      .catch(() => setPerm("prompt"));
  }, [native]);

  async function save(patch: Partial<Prefs>) {
    const before = prefs;
    setPrefs({ ...prefs, ...patch });
    try {
      const { prefs: saved } = await api<{ prefs: Prefs }>("/api/notifications/prefs", { method: "PATCH", body: patch });
      setPrefs(saved);
      setDraft(pick(saved));
      toast.success("Saved");
    } catch (e) {
      setPrefs(before);
      setDraft(pick(before));
      toast.error(errorMessage(e, "Couldn't save."));
    }
  }

  const commitTime = (key: TimeKey) => {
    if (draft[key] && draft[key] !== prefs[key]) save({ [key]: draft[key] });
  };

  async function enableOnPhone() {
    const r = await askForPush().catch(() => "denied" as const);
    setPerm(r === "granted" ? "granted" : r === "denied" ? "denied" : "prompt");
    if (r === "granted") setPhoneCount((n) => Math.max(n, 1));
  }

  async function sendTest() {
    setSending(true);
    try {
      await api("/api/push/test", { method: "POST" });
      toast.success("Sent — check your phone.");
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't send."));
    } finally {
      setSending(false);
    }
  }

  const time = (key: TimeKey, label: string, disabled: boolean) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <input
        type="time"
        value={draft[key]}
        disabled={disabled}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        onBlur={() => commitTime(key)}
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 tabular-nums text-[var(--color-text-primary)] [color-scheme:dark] disabled:opacity-40"
      />
    </label>
  );

  const off = !prefs.enabled;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <div>
        <Link href="/settings" className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <Bell className="h-7 w-7 text-[var(--color-brand-400)]" /> Notifications
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Reminders when a meal or goal is missed, and a cheer when you hit one. At most 5 a day, nothing on your first day, and
          none in quiet hours.
        </p>
      </div>

      {/* This phone */}
      <Card>
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-brand-400)]">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            {phone === "web" && (
              <>
                <p className="font-bold text-[var(--color-text-primary)]">
                  {phoneCount > 0 ? `${phoneCount} phone${phoneCount === 1 ? "" : "s"} connected` : "No phone connected yet"}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Notifications go to the FitStack Android app. Sign in there and allow notifications.
                </p>
              </>
            )}
            {phone === "checking" && <p className="text-sm text-[var(--color-text-muted)]">Checking this phone…</p>}
            {phone === "granted" && (
              <>
                <p className="font-bold text-[var(--color-text-primary)]">On for this phone ✓</p>
                <p className="text-sm text-[var(--color-text-secondary)]">You can mute “Reminders &amp; goals” in Android settings any time.</p>
              </>
            )}
            {phone === "prompt" && (
              <>
                <p className="font-bold text-[var(--color-text-primary)]">Off for this phone</p>
                <button onClick={enableOnPhone} className="mt-2 rounded-full bg-[var(--color-brand-500)] px-4 py-2 text-sm font-bold text-black">
                  Turn on for this phone
                </button>
              </>
            )}
            {phone === "denied" && (
              <>
                <p className="font-bold text-[var(--color-text-primary)]">Blocked in Android settings</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Open app settings → Notifications → allow.</p>
                <button onClick={() => openNativeSettings()} className="mt-2 rounded-full bg-[var(--color-surface-2)] px-4 py-2 text-sm font-bold text-[var(--color-text-primary)]">
                  Open settings
                </button>
              </>
            )}
          </div>
        </div>
        {serverReady && (phoneCount > 0 || phone === "granted") && (
          <button
            onClick={sendTest}
            disabled={sending}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send me a test notification"}
          </button>
        )}
      </Card>

      {/* Master switch */}
      <Card>
        <Row
          icon={prefs.enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          title="All notifications"
          sub={prefs.enabled ? "On" : "Off — nothing will be sent"}
          checked={prefs.enabled}
          onChange={(v) => save({ enabled: v })}
        />
      </Card>

      <Card className={off ? "opacity-50" : ""}>
        <Row title="Meal reminders" sub="Only if that meal isn't logged yet" checked={prefs.mealReminders} disabled={off} onChange={(v) => save({ mealReminders: v })} />
        <div className="mt-3 space-y-2 pl-1">
          {time("breakfastAt", "Breakfast", off || !prefs.mealReminders)}
          {time("lunchAt", "Lunch", off || !prefs.mealReminders)}
          {time("dinnerAt", "Dinner", off || !prefs.mealReminders)}
        </div>
      </Card>

      <Card className={off ? "opacity-50" : ""}>
        <Row title="Evening summary" sub="What's left of protein, calories, fiber and fat" checked={prefs.goalReminders} disabled={off} onChange={(v) => save({ goalReminders: v })} />
        <div className="mt-3 pl-1">{time("summaryAt", "Time", off || !prefs.goalReminders)}</div>
      </Card>

      <Card className={off ? "opacity-50" : ""}>
        <Row title="Achievements" sub="“Protein goal hit 💪”, “Perfect day ✅” — right after you log" checked={prefs.achievements} disabled={off} onChange={(v) => save({ achievements: v })} />
      </Card>

      <Card className={off ? "opacity-50" : ""}>
        <Row title="Morning recap" sub="How yesterday went, and your logging streak" checked={prefs.morningRecap} disabled={off} onChange={(v) => save({ morningRecap: v })} />
        <div className="mt-3 pl-1">{time("recapAt", "Time", off || !prefs.morningRecap)}</div>
      </Card>

      <Card className={off ? "opacity-50" : ""}>
        <div className="flex items-center gap-3">
          <Moon className="h-5 w-5 text-[var(--color-text-muted)]" />
          <div>
            <p className="font-bold text-[var(--color-text-primary)]">Quiet hours</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Nothing is sent between these times.</p>
          </div>
        </div>
        <div className="mt-3 space-y-2 pl-1">
          {time("quietStart", "From", off)}
          {time("quietEnd", "Until", off)}
        </div>
      </Card>
    </div>
  );
}

function pick(p: Prefs): Record<TimeKey, string> {
  return {
    breakfastAt: p.breakfastAt,
    lunchAt: p.lunchAt,
    dinnerAt: p.dinnerAt,
    summaryAt: p.summaryAt,
    recapAt: p.recapAt,
    quietStart: p.quietStart,
    quietEnd: p.quietEnd,
  };
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 ${className}`}>{children}</section>;
}

function Row(props: { icon?: ReactNode; title: string; sub: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  const id = `sw-${props.title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {props.icon && <span className="text-[var(--color-brand-400)]">{props.icon}</span>}
        <div className="min-w-0">
          <p id={id} className="font-bold text-[var(--color-text-primary)]">
            {props.title}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">{props.sub}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-labelledby={id}
        disabled={props.disabled}
        onClick={() => props.onChange(!props.checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${props.checked ? "bg-[var(--color-brand-500)]" : "bg-[var(--color-surface-2)]"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${props.checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
