import { decodePolyline } from "@/server/activity/geo";

// Shared display helpers for runs, walks, hikes and rides (server + client safe).

export type ActivityTypeId = "RUN" | "WALK" | "HIKE" | "RIDE" | "TREADMILL";

export const TYPE_LABEL: Record<ActivityTypeId, string> = {
  RUN: "Run",
  WALK: "Walk",
  HIKE: "Hike",
  RIDE: "Ride",
  TREADMILL: "Treadmill",
};

export const BEST_LABEL: Record<number, string> = {
  1000: "1 km",
  5000: "5 km",
  10000: "10 km",
  20000: "20 km",
  21097: "Half marathon",
  40000: "40 km",
  42195: "Marathon",
};

export const FEEL_LABEL = ["Hard", "Tough", "OK", "Good", "Great"];

/** 75 → "1:15", 3725 → "1:02:05" */
export function clock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

export const km = (m: number, digits = 2) => (m / 1000).toFixed(digits);

/** "Mon 17 Nov" for a YYYY-MM-DD local day. */
export function dayLabel(day: string, withYear = false) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

/** SVG path of an encoded route, fitted into a w×h box with padding. */
export function routePath(polyline: string | null | undefined, w: number, h: number, pad = 6): string | null {
  if (!polyline) return null;
  const pts = decodePolyline(polyline);
  if (pts.length < 2) return null;
  // Equirectangular projection is plenty for a city-sized route.
  const lat0 = (pts.reduce((a, p) => a + p.lat, 0) / pts.length) * (Math.PI / 180);
  const xy = pts.map((p) => [p.lng * Math.cos(lat0), -p.lat] as const);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1e-9;
  const spanY = Math.max(...ys) - minY || 1e-9;
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;
  return xy
    .map(([x, y], i) => `${i ? "L" : "M"}${(offX + (x - minX) * scale).toFixed(1)} ${(offY + (y - minY) * scale).toFixed(1)}`)
    .join("");
}
