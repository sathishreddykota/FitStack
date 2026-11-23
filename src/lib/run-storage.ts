"use client";

import type { TrackPoint } from "@/server/activity/geo";
import { api } from "@/lib/api-client";

// ─────────────────────────────────────────────
// On-device safety net for recordings:
//  - the run in progress survives a refresh, crash or closed tab
//  - finished runs that couldn't upload (no signal) wait in a queue and are
//    sent later; the server ignores duplicates by clientId, so retrying is safe
// localStorage can be unavailable (private mode) — every access is guarded.
// ─────────────────────────────────────────────

const ACTIVE_KEY = "fitstack.recording.v1";
const QUEUE_KEY = "fitstack.pendingActivities.v1";

export type RecordType = "RUN" | "WALK" | "HIKE" | "RIDE";

export interface ActiveRecording {
  clientId: string;
  type: RecordType;
  points: TrackPoint[];
  seg: number;
  startedAt: number;
  /** total ms spent paused (by the Pause button) */
  pausedMs: number;
  /** when the current pause began, or null while recording */
  pausedAt: number | null;
}

export interface PendingUpload {
  clientId: string;
  body: Record<string, unknown>;
  queuedAt: number;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the recording continues in memory */
  }
}

export const loadActive = () => read<ActiveRecording>(ACTIVE_KEY);
export const saveActive = (r: ActiveRecording | null) => write(ACTIVE_KEY, r);

export function newClientId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function queueUpload(item: PendingUpload) {
  const q = read<PendingUpload[]>(QUEUE_KEY) ?? [];
  if (!q.some((x) => x.clientId === item.clientId)) q.push(item);
  write(QUEUE_KEY, q);
}

export const pendingCount = () => (read<PendingUpload[]>(QUEUE_KEY) ?? []).length;

/** Try to send every queued activity. Returns how many were saved. */
export async function flushQueue(): Promise<number> {
  const q = read<PendingUpload[]>(QUEUE_KEY) ?? [];
  if (!q.length) return 0;
  const left: PendingUpload[] = [];
  let sent = 0;
  for (const item of q) {
    try {
      await api("/api/activities", { body: item.body });
      sent++;
    } catch (err) {
      // Keep it only for network problems; a 4xx means it will never succeed as-is.
      const status = (err as { status?: number }).status ?? 0;
      if (status === 0 || status >= 500 || status === 401) left.push(item);
    }
  }
  write(QUEUE_KEY, left.length ? left : null);
  return sent;
}
