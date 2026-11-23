"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// ─────────────────────────────────────────────
// Google sign-in inside the Android app (see src/server/native-auth.ts for the
// server half). Google blocks sign-in inside an app's web view, so:
//   1. ask the server for a hand-off { id, verifier }; keep the verifier here
//   2. open Google sign-in in a browser tab (Custom Tab) with only the id
//   3. the tab returns to the app via com.daystrong.app://auth?id=…
//   4. claim with id + verifier → one-time Clerk ticket → sign in here
// Plugins are reached by name (registerPlugin) so the web bundle stays light.
// ─────────────────────────────────────────────

interface BrowserPlugin {
  open(o: { url: string; presentationStyle?: "fullscreen" | "popover"; toolbarColor?: string }): Promise<void>;
  close(): Promise<void>;
}
interface AppPlugin {
  addListener(event: "appUrlOpen", fn: (e: { url: string }) => void): Promise<PluginListenerHandle>;
  getLaunchUrl(): Promise<{ url: string } | undefined>;
}

const Browser = registerPlugin<BrowserPlugin>("Browser");
const App = registerPlugin<AppPlugin>("App");

const KEY = "fitstack.nativeAuth";
/** Matches the server's hand-off lifetime. */
const MAX_AGE_MS = 10 * 60_000;

export const nativeAuthAvailable = () => Capacitor.isNativePlatform();

interface Pending {
  id: string;
  verifier: string;
  at: number;
}

function readPending(): Pending | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Pending | null;
    return p && Date.now() - p.at < MAX_AGE_MS ? p : null;
  } catch {
    return null;
  }
}
function writePending(p: Pending | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error ?? "Something went wrong. Please try again.");
  return json.data as T;
}

/** Step 1–2: start Google sign-in in a browser tab. */
export async function startGoogleSignIn() {
  const { id, verifier } = await post<{ id: string; verifier: string }>("/api/native-auth/begin");
  writePending({ id, verifier, at: Date.now() });
  await Browser.open({ url: `${window.location.origin}/native-auth/start?id=${id}`, toolbarColor: "#0A0A0F" });
}

/** The id from a com.daystrong.app://auth?id=… link, or null if it isn't one. */
export function handoffIdFromUrl(url: string): string | null {
  const m = /^com\.daystrong\.app:\/\/auth\/?\?(?:.*&)?id=([a-z0-9]{10,64})(?:&|$)/.exec(url);
  return m ? m[1] : null;
}

/** Step 3–4: the tab sent us back. Returns a one-time Clerk sign-in ticket, or null if the link isn't ours. */
export async function claimGoogleSignIn(url: string): Promise<string | null> {
  const id = handoffIdFromUrl(url);
  const pending = readPending();
  if (!id || !pending || pending.id !== id) return null; // not ours / stale
  writePending(null);
  await Browser.close().catch(() => {});
  const { ticket } = await post<{ ticket: string }>("/api/native-auth/claim", { id, verifier: pending.verifier });
  return ticket;
}

/** Listen for "return to app" links (also the one that cold-started the app). */
export async function listenForSignInReturn(onUrl: (url: string) => void): Promise<() => void> {
  const handle = await App.addListener("appUrlOpen", ({ url }) => onUrl(url));
  const launch = await App.getLaunchUrl().catch(() => undefined);
  if (launch?.url) onUrl(launch.url);
  return () => void handle.remove();
}
