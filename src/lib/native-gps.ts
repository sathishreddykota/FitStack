"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

// ─────────────────────────────────────────────
// GPS inside the Android app (Capacitor + @capgo/background-geolocation).
// While a run is recording, positions come from a native foreground service
// with a "Recording" notification, so tracking keeps going with the screen off
// or another app open. Without the app (plain browser) none of this runs.
//
// Only the plugin's JS name is used here (registerPlugin), so the web bundle
// doesn't pull in the plugin package.
// ─────────────────────────────────────────────

interface NativeLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  time: number | null;
}

interface NativeError extends Error {
  code?: string;
}

interface BackgroundGeolocationPlugin {
  start(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (position?: NativeLocation, error?: NativeError) => void,
  ): Promise<void>;
  stop(): Promise<void>;
  openSettings(): Promise<void>;
}

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

export const isNativeApp = () => Capacitor.isNativePlatform();

export type NativeGpsProblem = "denied" | "disabled" | "failed";

export interface NativeFix {
  lat: number;
  lng: number;
  acc: number;
  alt: number | null;
  t: number;
}

// The plugin runs one watcher at a time: every start waits for the previous stop.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = (fn: () => Promise<unknown>) => (queue = queue.then(fn, fn));

/**
 * Watch the position. `background: true` (while recording) runs the foreground
 * service with its notification; otherwise updates only arrive while the app is open.
 * Returns a stop function.
 */
export function watchNativePosition(
  background: boolean,
  onFix: (f: NativeFix) => void,
  onProblem: (p: NativeGpsProblem) => void,
): () => void {
  let active = true;

  const report = (err?: NativeError) => {
    if (!active || !err) return;
    if (err.code === "NOT_AUTHORIZED") onProblem(/disabled/i.test(err.message) ? "disabled" : "denied");
    else onProblem("failed");
  };

  enqueue(async () => {
    await BackgroundGeolocation.stop().catch(() => {});
    if (!active) return;
    await BackgroundGeolocation.start(
      {
        backgroundTitle: "FitStack is recording",
        // Setting a message is what keeps updates coming in the background.
        backgroundMessage: background ? "Tracking your route — tap to open" : undefined,
        requestPermissions: true,
        stale: false,
        distanceFilter: 0,
      },
      (pos, err) => {
        if (err) return report(err);
        if (!active || !pos) return;
        onFix({
          lat: pos.latitude,
          lng: pos.longitude,
          acc: pos.accuracy,
          alt: pos.altitude,
          t: pos.time ?? Date.now(),
        });
      },
    ).catch(report);
  });

  return () => {
    active = false;
    enqueue(() => BackgroundGeolocation.stop().catch(() => {}));
  };
}

/** Open the app's settings page (to allow location after "Don't allow"). */
export const openNativeSettings = () => BackgroundGeolocation.openSettings().catch(() => {});
