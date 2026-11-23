import { describe, expect, it } from "vitest";
import {
  bestEfforts,
  caloriesBurned,
  cleanTrack,
  decodePolyline,
  downsample,
  elevationGain,
  encodePolyline,
  formatPace,
  haversine,
  summarize,
  type TrackPoint,
} from "./geo";

const M_PER_DEG_LAT = 111_195; // metres per degree of latitude on our Earth radius

/** A straight run north from Hyderabad at `speed` m/s, one fix every `every` seconds. */
function track(opts: { metres: number; speed: number; every?: number; t0?: number; startLat?: number }): TrackPoint[] {
  const every = opts.every ?? 3;
  const lat0 = opts.startLat ?? 17.385;
  const t0 = opts.t0 ?? Date.UTC(2026, 10, 17, 1, 0, 0);
  const n = Math.round(opts.metres / (opts.speed * every));
  return Array.from({ length: n + 1 }, (_, i) => ({
    lat: lat0 + (i * opts.speed * every) / M_PER_DEG_LAT,
    lng: 78.4867,
    t: t0 + i * every * 1000,
    acc: 5,
  }));
}

describe("haversine", () => {
  it("measures 1 degree of latitude", () => {
    expect(haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(M_PER_DEG_LAT, -1);
  });
});

describe("summarize", () => {
  it("gets distance, time, pace and km splits for a steady 2 km run", () => {
    const pts = cleanTrack(track({ metres: 2000, speed: 3 }), "RUN"); // 3 m/s = 5:33 /km
    const s = summarize(pts, "RUN");
    expect(s.distanceM).toBeGreaterThan(1990);
    expect(s.distanceM).toBeLessThan(2010);
    expect(s.movingSec).toBeCloseTo(667, -1);
    expect(s.avgPaceSecPerKm).toBeCloseTo(333, -1);
    expect(s.splits).toHaveLength(2);
    expect(s.splits[0].movingSec).toBeCloseTo(333, -1);
    expect(formatPace(s.avgPaceSecPerKm)).toBe("5:33");
  });

  it("auto-pauses: standing still at a traffic light doesn't count as moving time", () => {
    const a = track({ metres: 600, speed: 3 });
    const last = a[a.length - 1];
    const wait = Array.from({ length: 20 }, (_, i) => ({ ...last, t: last.t + (i + 1) * 3000, lat: last.lat + (i % 2) * 0.000005 }));
    const b = track({ metres: 600, speed: 3, t0: wait[wait.length - 1].t + 3000, startLat: last.lat + 3 / M_PER_DEG_LAT });
    const s = summarize(cleanTrack([...a, ...wait, ...b], "RUN"), "RUN");
    expect(s.elapsedSec - s.movingSec).toBeGreaterThanOrEqual(55);
    expect(s.movingSec).toBeCloseTo(400, -1);
  });

  it("treats a long gap (tunnel / paused recording) as not moving", () => {
    const a = track({ metres: 500, speed: 3 });
    const b = track({ metres: 500, speed: 3, t0: a[a.length - 1].t + 600_000, startLat: a[a.length - 1].lat + 3 / M_PER_DEG_LAT });
    const s = summarize(cleanTrack([...a, ...b], "RUN"), "RUN");
    expect(s.elapsedSec).toBeGreaterThan(900);
    expect(s.movingSec).toBeLessThan(350);
  });

  it("ignores distance and time covered while paused (Pause → Resume segments)", () => {
    const a = track({ metres: 1000, speed: 3 }).map((p) => ({ ...p, seg: 0 }));
    const last = a[a.length - 1];
    // Paused, walked 400 m to a café, resumed 5 minutes later
    const b = track({ metres: 1000, speed: 3, t0: last.t + 300_000, startLat: last.lat + 400 / M_PER_DEG_LAT }).map((p) => ({ ...p, seg: 1 }));
    const s = summarize(cleanTrack([...a, ...b], "RUN"), "RUN");
    expect(s.distanceM).toBeGreaterThan(1990);
    expect(s.distanceM).toBeLessThan(2010);
    expect(s.movingSec).toBeCloseTo(667, -1);
  });

  it("handles an empty track", () => {
    expect(summarize([], "RUN")).toMatchObject({ distanceM: 0, movingSec: 0, splits: [] });
  });
});

describe("cleanTrack", () => {
  it("drops GPS spikes, poor-accuracy fixes and jitter", () => {
    const pts = track({ metres: 600, speed: 3 }); // 201 fixes
    const spike = { ...pts[20], lat: pts[20].lat + 0.01, t: pts[20].t + 500 }; // 1.1 km jump in 0.5 s
    const blurry = { ...pts[30], lat: pts[30].lat + 0.0001, t: pts[30].t + 1000, acc: 80 };
    const jitter = { ...pts[40], lat: pts[40].lat + 0.000001, t: pts[40].t + 1000 };
    const cleaned = cleanTrack([...pts, spike, blurry, jitter], "RUN");
    expect(cleaned).toHaveLength(pts.length);
    expect(summarize(cleaned, "RUN").distanceM).toBeLessThan(610);
  });

  it("allows bike speeds that a run would reject", () => {
    const fast = track({ metres: 1000, speed: 9 }); // 32 km/h
    expect(cleanTrack(fast, "RIDE").length).toBe(fast.length);
    expect(cleanTrack(fast, "WALK").length).toBe(1);
  });
});

describe("bestEfforts", () => {
  it("finds the fastest 1 km inside a run with a fast middle section", () => {
    const easy1 = track({ metres: 1000, speed: 3 });
    const fast = track({ metres: 1000, speed: 4, t0: easy1[easy1.length - 1].t + 3000, startLat: easy1[easy1.length - 1].lat + 9 / M_PER_DEG_LAT });
    const easy2 = track({ metres: 1000, speed: 3, t0: fast[fast.length - 1].t + 3000, startLat: fast[fast.length - 1].lat + 9 / M_PER_DEG_LAT });
    const s = summarize(cleanTrack([...easy1, ...fast, ...easy2], "RUN"), "RUN");
    const [k1] = bestEfforts(s.cumDist, s.cumMoving, [1000, 5000]);
    expect(k1.distanceM).toBe(1000);
    expect(k1.timeSec).toBeCloseTo(250, -1); // 1 km at 4 m/s
    expect(bestEfforts(s.cumDist, s.cumMoving, [5000])).toEqual([]); // run is only 3 km
  });
});

describe("elevationGain", () => {
  it("ignores GPS altitude noise but counts a real climb", () => {
    const noise = Array.from({ length: 60 }, (_, i) => 500 + (i % 2 ? 1.5 : -1.5));
    expect(elevationGain(noise)).toBe(0);
    const climb = Array.from({ length: 50 }, (_, i) => 500 + i);
    expect(elevationGain(climb)).toBeGreaterThanOrEqual(45);
    expect(elevationGain([null, null])).toBeNull();
  });
});

describe("caloriesBurned", () => {
  it("uses ~1 kcal/kg/km for running and less for walking", () => {
    expect(caloriesBurned("RUN", 70, 5000, 1800)).toBe(350);
    expect(caloriesBurned("WALK", 70, 5000, 3600)).toBe(186);
    expect(caloriesBurned("RIDE", 70, 20000, 3600)).toBe(560); // 20 km/h → MET 8 × 70 kg × 1 h
  });
});

describe("polyline", () => {
  it("matches Google's reference encoding and round-trips", () => {
    const pts = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    const enc = encodePolyline(pts);
    expect(enc).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(decodePolyline(enc)).toEqual(pts);
  });

  it("downsamples long tracks keeping the ends", () => {
    const pts = Array.from({ length: 5000 }, (_, i) => i);
    const d = downsample(pts, 100);
    expect(d).toHaveLength(100);
    expect(d[0]).toBe(0);
    expect(d[99]).toBe(4999);
  });
});
