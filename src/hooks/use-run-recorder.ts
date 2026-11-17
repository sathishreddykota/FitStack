"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cleanTrack, haversine, summarize, type TrackPoint } from "@/server/activity/geo";
import { loadActive, newClientId, saveActive, type ActiveRecording, type RecordType } from "@/lib/run-storage";
import { isNativeApp, watchNativePosition } from "@/lib/native-gps";

// ─────────────────────────────────────────────
// useRunRecorder — browser GPS recording.
// In a browser it works while the page is open and the screen is on (we hold a
// Wake Lock). In the Android app, positions come from a native foreground
// service while recording, so it keeps going with the screen off.
// ─────────────────────────────────────────────

export type GpsState = "off" | "searching" | "weak" | "good" | "denied" | "unsupported";
export type RecorderStatus = "idle" | "recording" | "paused";

interface Fix {
  lat: number;
  lng: number;
  acc: number;
  alt: number | null;
  t: number;
}

/** Dev-only fake GPS: a 400 m loop around a park at ~3.2 m/s (enable with ?simulate=1). */
function simulator(onFix: (f: Fix) => void) {
  const centre = { lat: 17.4239, lng: 78.4738 };
  const r = 400 / (2 * Math.PI); // metres
  let angle = 0;
  const id = setInterval(() => {
    angle += 3.2 / r + (Math.random() - 0.5) * 0.002;
    const dLat = (r * Math.cos(angle)) / 111_195;
    const dLng = (r * Math.sin(angle)) / (111_195 * Math.cos((centre.lat * Math.PI) / 180));
    onFix({ lat: centre.lat + dLat, lng: centre.lng + dLng, acc: 4 + Math.random() * 3, alt: 540 + Math.sin(angle) * 4, t: Date.now() });
  }, 1000);
  return () => clearInterval(id);
}

export function useRunRecorder(opts: { simulate?: boolean } = {}) {
  // This hook runs client-only (the record screen is loaded with ssr: false),
  // so the initial state can read the device directly.
  const [native] = useState(() => !opts.simulate && isNativeApp());
  const [gps, setGps] = useState<GpsState>(() =>
    native || opts.simulate || (typeof navigator !== "undefined" && "geolocation" in navigator) ? "searching" : "unsupported",
  );
  const [fix, setFix] = useState<Fix | null>(null);
  // Restore an unfinished recording (refresh, crash, closed tab) — it comes back paused.
  const [rec, setRec] = useState<ActiveRecording | null>(() => {
    const saved = loadActive();
    return saved?.points ? { ...saved, pausedAt: saved.pausedAt ?? Date.now() } : null;
  });
  const [now, setNow] = useState(() => Date.now());
  const recRef = useRef<ActiveRecording | null>(rec);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  const status: RecorderStatus = !rec ? "idle" : rec.pausedAt ? "paused" : "recording";
  // App only: run the foreground service (notification + screen-off tracking) while recording.
  const background = native && status === "recording";

  const update = useCallback((next: ActiveRecording | null, persist = true) => {
    recRef.current = next;
    setRec(next);
    if (persist) saveActive(next);
  }, []);

  // GPS: start watching as soon as the screen opens, so the signal is ready before Start.
  useEffect(() => {
    const onFix = (f: Fix) => {
      setFix(f);
      setGps(f.acc <= 20 ? "good" : "weak");
      const r = recRef.current;
      if (r && !r.pausedAt) {
        const point: TrackPoint = { lat: f.lat, lng: f.lng, t: f.t, alt: f.alt, acc: f.acc, seg: r.seg };
        const next = { ...r, points: [...r.points, point] };
        // Persist every 5 points (and on pause/finish) to keep writes cheap.
        update(next, next.points.length % 5 === 0);
      }
    };

    if (opts.simulate) return simulator(onFix);
    if (native) {
      return watchNativePosition(background, onFix, (problem) =>
        setGps(problem === "denied" ? "denied" : problem === "disabled" ? "off" : "weak"),
      );
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) =>
        onFix({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          acc: p.coords.accuracy,
          alt: p.coords.altitude,
          t: p.timestamp || Date.now(),
        }),
      (err) => setGps(err.code === err.PERMISSION_DENIED ? "denied" : "weak"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [opts.simulate, native, background, update]);

  // Clock tick for the live timer.
  useEffect(() => {
    if (status !== "recording") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [status]);

  // Keep the screen on while recording (browsers stop GPS when it turns off).
  // Not needed in the app: the foreground service tracks with the screen off.
  useEffect(() => {
    if (status !== "recording" || native) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
        if (nav.wakeLock && document.visibilityState === "visible") wake.current = await nav.wakeLock.request("screen");
      } catch {
        /* not available (desktop, low battery) — recording still works while visible */
      }
    };
    const onVis = () => {
      if (!cancelled && document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      wake.current?.release().catch(() => {});
      wake.current = null;
    };
  }, [status, native]);

  const start = useCallback(
    (type: RecordType) => {
      update({ clientId: newClientId(), type, points: [], seg: 0, startedAt: Date.now(), pausedMs: 0, pausedAt: null });
      setNow(Date.now());
    },
    [update],
  );

  const pause = useCallback(() => {
    const r = recRef.current;
    if (r && !r.pausedAt) update({ ...r, pausedAt: Date.now() });
  }, [update]);

  const resume = useCallback(() => {
    const r = recRef.current;
    if (r?.pausedAt) {
      update({ ...r, pausedMs: r.pausedMs + (Date.now() - r.pausedAt), pausedAt: null, seg: r.seg + 1 });
      setNow(Date.now());
    }
  }, [update]);

  /** Stop and hand back the recording (kept on the device until `discard()` after a successful save). */
  const finish = useCallback(() => {
    const r = recRef.current;
    if (!r) return null;
    const done = r.pausedAt ? r : { ...r, pausedAt: Date.now() };
    update(done);
    return done;
  }, [update]);

  const discard = useCallback(() => update(null), [update]);

  // Live numbers.
  const stats = useMemo(() => {
    if (!rec) return { distanceM: 0, movingSec: 0, paceSecPerKm: null as number | null, currentPaceSecPerKm: null as number | null, points: [] as TrackPoint[] };
    const pts = cleanTrack(rec.points, rec.type);
    const s = summarize(pts, rec.type);
    // Current pace from the last ~30 s of this segment.
    let current: number | null = null;
    const last = pts[pts.length - 1];
    if (last) {
      let i = pts.length - 1;
      while (i > 0 && last.t - pts[i - 1].t <= 30_000 && (pts[i - 1].seg ?? 0) === (last.seg ?? 0)) i--;
      let d = 0;
      for (let k = i + 1; k < pts.length; k++) d += haversine(pts[k - 1], pts[k]);
      const sec = (last.t - pts[i].t) / 1000;
      if (d > 20 && sec > 5) current = Math.round(sec / (d / 1000));
    }
    return { distanceM: s.distanceM, movingSec: s.movingSec, paceSecPerKm: s.avgPaceSecPerKm, currentPaceSecPerKm: current, points: pts };
  }, [rec]);

  const elapsedSec = rec ? Math.max(0, Math.round(((rec.pausedAt ?? now) - rec.startedAt - rec.pausedMs) / 1000)) : 0;

  return { gps, fix, rec, status, stats, elapsedSec, native, start, pause, resume, finish, discard };
}
