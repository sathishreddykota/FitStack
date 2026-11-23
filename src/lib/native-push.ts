"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// ─────────────────────────────────────────────
// Push notifications inside the Android app (@capacitor/push-notifications).
// Only the plugin's JS name is used (registerPlugin), so the web bundle doesn't
// pull in the plugin package — same pattern as native-gps.ts.
// In a plain browser every function here is a no-op.
// ─────────────────────────────────────────────

type PermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

interface ActionPerformed {
  notification: { data?: Record<string, string> };
}

interface PushPlugin {
  checkPermissions(): Promise<{ receive: PermissionState }>;
  requestPermissions(): Promise<{ receive: PermissionState }>;
  register(): Promise<void>;
  createChannel(channel: { id: string; name: string; description?: string; importance?: 1 | 2 | 3 | 4 | 5; vibration?: boolean; lights?: boolean; lightColor?: string }): Promise<void>;
  addListener(event: "registration", fn: (t: { value: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: "registrationError", fn: (e: { error: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: "pushNotificationActionPerformed", fn: (a: ActionPerformed) => void): Promise<PluginListenerHandle>;
}

const Push = registerPlugin<PushPlugin>("PushNotifications");

const TOKEN_KEY = "fitstack.pushToken";
const SNOOZE_KEY = "fitstack.pushAskSnoozedUntil";
/** After "Not now", wait this long before asking again. */
export const ASK_SNOOZE_MS = 7 * 86_400_000;

export const pushAvailable = () => Capacitor.isNativePlatform();

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* storage unavailable — fine */
    }
  },
};

export async function pushPermission(): Promise<PermissionState | "unavailable"> {
  if (!pushAvailable()) return "unavailable";
  return (await Push.checkPermissions()).receive;
}

/** Only internal paths: a notification can never send the app to another site. */
export function safeInternalPath(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//") || url.includes("\\")) return null;
  return url;
}

let listening = false;

/**
 * Wire up listeners (once per app launch): save the token on the server, and
 * open the right screen when a notification is tapped. Taps that launched the
 * app are delivered here too (the plugin holds them until a listener exists).
 */
export async function startPushListeners(openPath: (path: string) => void) {
  if (!pushAvailable() || listening) return;
  listening = true;
  await Push.createChannel({
    id: "reminders",
    name: "Reminders & goals",
    description: "Meal reminders, goal progress and achievements",
    importance: 4,
    vibration: true,
  }).catch(() => {});
  await Push.addListener("registration", ({ value }) => {
    store.set(TOKEN_KEY, value);
    fetch("/api/push/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: value, platform: "android" }),
    }).catch(() => {});
  });
  await Push.addListener("registrationError", (e) => console.warn("[push] registration failed:", e.error));
  await Push.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const path = safeInternalPath(notification.data?.url);
    if (path) openPath(path);
  });
}

/** Register with Firebase if notifications are already allowed (refreshes the token each launch). */
export async function registerIfAllowed(): Promise<boolean> {
  if ((await pushPermission()) !== "granted") return false;
  await Push.register();
  return true;
}

/** Show the system "Allow notifications?" dialog, then register. Returns the final state. */
export async function askForPush(): Promise<PermissionState | "unavailable"> {
  if (!pushAvailable()) return "unavailable";
  const { receive } = await Push.requestPermissions();
  if (receive === "granted") await Push.register();
  return receive;
}

/** Should we show our "Get reminders?" card now? Only if Android would still show its dialog. */
export async function shouldOfferPush(now = Date.now()): Promise<boolean> {
  const p = await pushPermission();
  if (p !== "prompt" && p !== "prompt-with-rationale") return false;
  return Number(store.get(SNOOZE_KEY) ?? 0) <= now;
}

export const snoozePushOffer = (now = Date.now()) => store.set(SNOOZE_KEY, String(now + ASK_SNOOZE_MS));

/** Signed out on this phone: stop sending to it. Works without a session (the token proves the device). */
export async function unregisterPush() {
  const token = store.get(TOKEN_KEY);
  if (!token) return;
  store.set(TOKEN_KEY, null);
  await fetch("/api/push/unregister", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}

export const hasStoredPushToken = () => !!store.get(TOKEN_KEY);

/** Fired by the API client after a meal is logged (see api-client.ts). */
export const MEAL_LOGGED_EVENT = "fitstack:meal-logged";
