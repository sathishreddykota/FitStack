// ─────────────────────────────────────────────
// GPS track maths (pure, unit tested). Shared by the server (source of truth
// for saved activities) and the recording screen (live stats).
// ─────────────────────────────────────────────

export type ActivityKind = "RUN" | "WALK" | "HIKE" | "RIDE" | "TREADMILL";

export interface TrackPoint {
  lat: number;
  lng: number;
  /** epoch milliseconds */
  t: number;
  /** metres above sea level, when the device knows it */
  alt?: number | null;
  /** horizontal accuracy in metres (smaller is better) */
  acc?: number | null;
  /** recording segment: increases after each Pause → Resume. Nothing between segments counts. */
  seg?: number | null;
}

const sameSeg = (a: TrackPoint, b: TrackPoint) => (a.seg ?? 0) === (b.seg ?? 0);

const R = 6_371_008.8; // mean Earth radius (m)
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: Pick<TrackPoint, "lat" | "lng">, b: Pick<TrackPoint, "lat" | "lng">): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Per-sport limits used for cleaning and auto-pause. */
export const SPORT = {
  RUN: { maxSpeed: 12, pauseBelow: 0.6 }, // 12 m/s ≈ world-record sprint
  TREADMILL: { maxSpeed: 12, pauseBelow: 0.6 },
  WALK: { maxSpeed: 4.5, pauseBelow: 0.35 },
  HIKE: { maxSpeed: 4.5, pauseBelow: 0.3 },
  RIDE: { maxSpeed: 30, pauseBelow: 1.2 },
} as const satisfies Record<ActivityKind, { maxSpeed: number; pauseBelow: number }>;

const MAX_ACCURACY_M = 35; // ignore fixes worse than this
const MIN_STEP_M = 2.5; // ignore jitter while standing still
const GAP_AS_PAUSE_SEC = 45; // a gap this long (tunnel, pause button) never counts as moving

/**
 * Clean a raw GPS track:
 *  - sort by time, drop invalid / duplicate timestamps
 *  - drop low-accuracy fixes
 *  - drop "teleports" (implied speed above the sport's maximum)
 *  - drop sub-2.5 m jitter while standing still
 */
export function cleanTrack(raw: TrackPoint[], kind: ActivityKind): TrackPoint[] {
  const pts = raw
    .filter(
      (p) =>
        Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t) &&
        Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 &&
        (p.acc == null || p.acc <= MAX_ACCURACY_M),
    )
    .sort((a, b) => a.t - b.t);

  const out: TrackPoint[] = [];
  const { maxSpeed } = SPORT[kind];
  for (const p of pts) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(p);
      continue;
    }
    const dt = (p.t - prev.t) / 1000;
    if (dt <= 0) continue;
    if (!sameSeg(prev, p)) {
      out.push(p); // first fix after Resume: the user may have moved while paused
      continue;
    }
    const d = haversine(prev, p);
    if (d / dt > maxSpeed) continue; // teleport / multipath spike
    if (d < MIN_STEP_M) continue; // standing-still jitter
    out.push(p);
  }
  return out;
}

export interface Split {
  index: number;
  distanceM: number;
  movingSec: number;
  elevDeltaM: number | null;
}

export interface TrackSummary {
  startedAt: number;
  elapsedSec: number;
  movingSec: number;
  distanceM: number;
  elevationGainM: number | null;
  avgPaceSecPerKm: number | null;
  maxSpeedMps: number | null;
  splits: Split[];
  /** cumulative distance (m) and moving time (s) at every point — for best efforts & charts */
  cumDist: number[];
  cumMoving: number[];
}

/** Elevation gain with smoothing + a 3 m hysteresis so GPS altitude noise isn't counted as climbing. */
export function elevationGain(alts: (number | null | undefined)[], threshold = 3): number | null {
  const vals = alts.filter((a): a is number => typeof a === "number" && Number.isFinite(a));
  if (vals.length < 2) return null;
  const w = 5;
  const smooth = vals.map((_, i) => {
    const s = vals.slice(Math.max(0, i - (w >> 1)), i + (w >> 1) + 1);
    return s.reduce((x, y) => x + y, 0) / s.length;
  });
  let gain = 0;
  let base = smooth[0];
  for (const a of smooth) {
    if (a - base >= threshold) {
      gain += a - base;
      base = a;
    } else if (a < base) {
      base = a;
    }
  }
  return Math.round(gain);
}

/** Distance, moving time (with auto-pause), splits per km and pace for a CLEANED track. */
export function summarize(pts: TrackPoint[], kind: ActivityKind): TrackSummary {
  const n = pts.length;
  const cumDist = new Array<number>(n).fill(0);
  const cumMoving = new Array<number>(n).fill(0);
  if (n === 0) {
    return { startedAt: 0, elapsedSec: 0, movingSec: 0, distanceM: 0, elevationGainM: null, avgPaceSecPerKm: null, maxSpeedMps: null, splits: [], cumDist, cumMoving };
  }
  const { pauseBelow } = SPORT[kind];
  let maxSpeed = 0;

  for (let i = 1; i < n; i++) {
    const dt = (pts[i].t - pts[i - 1].t) / 1000;
    const d = sameSeg(pts[i - 1], pts[i]) ? haversine(pts[i - 1], pts[i]) : 0; // paused stretch: no distance
    const speed = d / dt;
    const moving = dt <= GAP_AS_PAUSE_SEC && speed >= pauseBelow;
    cumDist[i] = cumDist[i - 1] + d;
    cumMoving[i] = cumMoving[i - 1] + (moving ? dt : 0);
    if (moving && dt >= 2) maxSpeed = Math.max(maxSpeed, speed); // ignore 1 s spikes
  }

  const distanceM = cumDist[n - 1];
  const movingSec = Math.round(cumMoving[n - 1]);

  // Splits: interpolate the moving time at each whole-km boundary.
  const splits: Split[] = [];
  const timeAt = (target: number) => {
    let i = 1;
    while (i < n && cumDist[i] < target) i++;
    if (i >= n) return cumMoving[n - 1];
    const span = cumDist[i] - cumDist[i - 1] || 1;
    const f = (target - cumDist[i - 1]) / span;
    return cumMoving[i - 1] + f * (cumMoving[i] - cumMoving[i - 1]);
  };
  const altAt = (target: number) => {
    let i = 0;
    while (i < n - 1 && cumDist[i] < target) i++;
    return pts[i].alt ?? null;
  };
  let prevT = 0;
  let prevD = 0;
  for (let k = 1; k * 1000 <= distanceM; k++) {
    const t = timeAt(k * 1000);
    const a0 = altAt(prevD);
    const a1 = altAt(k * 1000);
    splits.push({
      index: k - 1,
      distanceM: 1000,
      movingSec: Math.round(t - prevT),
      elevDeltaM: a0 != null && a1 != null ? Math.round(a1 - a0) : null,
    });
    prevT = t;
    prevD = k * 1000;
  }
  const rest = distanceM - prevD;
  if (rest >= 50) {
    const a0 = altAt(prevD);
    const a1 = pts[n - 1].alt ?? null;
    splits.push({
      index: splits.length,
      distanceM: Math.round(rest),
      movingSec: Math.round(cumMoving[n - 1] - prevT),
      elevDeltaM: a0 != null && a1 != null ? Math.round(a1 - a0) : null,
    });
  }

  return {
    startedAt: pts[0].t,
    elapsedSec: Math.round((pts[n - 1].t - pts[0].t) / 1000),
    movingSec,
    distanceM: Math.round(distanceM * 10) / 10,
    elevationGainM: elevationGain(pts.map((p) => p.alt)),
    avgPaceSecPerKm: distanceM >= 100 ? Math.round(movingSec / (distanceM / 1000)) : null,
    maxSpeedMps: maxSpeed > 0 ? Math.round(maxSpeed * 100) / 100 : null,
    splits,
    cumDist,
    cumMoving,
  };
}

/** Distances we track personal bests for (metres). */
export const BEST_EFFORT_DISTANCES = { RUN: [1000, 5000, 10000, 21097], WALK: [1000, 5000], HIKE: [], RIDE: [10000, 20000, 40000], TREADMILL: [] } as const;

/**
 * Fastest moving time to cover each distance anywhere inside the activity
 * (two-pointer sliding window over cumulative distance, interpolated at the edge).
 */
export function bestEfforts(cumDist: number[], cumMoving: number[], distances: readonly number[]): { distanceM: number; timeSec: number }[] {
  const n = cumDist.length;
  const total = n ? cumDist[n - 1] : 0;
  const out: { distanceM: number; timeSec: number }[] = [];
  for (const target of distances) {
    if (total < target) continue;
    let best = Infinity;
    let j = 0;
    for (let i = 0; i < n; i++) {
      if (j < i) j = i;
      while (j < n && cumDist[j] - cumDist[i] < target) j++;
      if (j >= n) break;
      // Interpolate the exact point where `target` metres is reached between j-1 and j.
      const over = cumDist[j] - cumDist[i] - target;
      const seg = cumDist[j] - cumDist[j - 1] || 1;
      const tEnd = cumMoving[j] - (over / seg) * (cumMoving[j] - cumMoving[j - 1]);
      best = Math.min(best, tEnd - cumMoving[i]);
    }
    if (Number.isFinite(best) && best > 0) out.push({ distanceM: target, timeSec: Math.round(best) });
  }
  return out;
}

/**
 * Calories burned (estimate). Running ≈ 1 kcal per kg per km; walking ≈ 0.5;
 * cycling from MET by speed. Rounded down a little — wearables tend to overestimate.
 */
export function caloriesBurned(kind: ActivityKind, weightKg: number, distanceM: number, movingSec: number): number {
  const km = distanceM / 1000;
  const hours = movingSec / 3600;
  if (!(weightKg > 0)) return 0;
  switch (kind) {
    case "RUN":
    case "TREADMILL":
      return Math.round(weightKg * km * 1.0);
    case "WALK":
      return Math.round(weightKg * km * 0.53);
    case "HIKE":
      return Math.round(weightKg * km * 0.65);
    case "RIDE": {
      const kmh = hours > 0 ? km / hours : 0;
      const met = kmh < 16 ? 4 : kmh < 20 ? 6.8 : kmh < 25 ? 8 : 10;
      return Math.round(met * weightKg * hours);
    }
  }
}

/** Format seconds-per-km as "5:12". */
export function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm || !Number.isFinite(secPerKm)) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, "0")}`;
}

// ── Polyline (Google encoded polyline algorithm, precision 5) ───────

export function encodePolyline(points: Pick<TrackPoint, "lat" | "lng">[]): string {
  let out = "";
  let pLat = 0;
  let pLng = 0;
  const enc = (v: number) => {
    let x = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (x >= 0x20) {
      s += String.fromCharCode((0x20 | (x & 0x1f)) + 63);
      x >>= 5;
    }
    return s + String.fromCharCode(x + 63);
  };
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += enc(lat - pLat) + enc(lng - pLng);
    pLat = lat;
    pLng = lng;
  }
  return out;
}

export function decodePolyline(str: string): { lat: number; lng: number }[] {
  const out: { lat: number; lng: number }[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = str.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && i < str.length + 1);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) {
    lat += next();
    lng += next();
    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}

/** Keep at most `max` points for storage/drawing, always keeping the first and last. */
export function downsample<T>(pts: T[], max = 2000): T[] {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, k) => pts[Math.round(k * step)]);
}
