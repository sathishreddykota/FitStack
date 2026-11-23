import "server-only";
import { prisma } from "@/lib/prisma";
import type { Notification } from "./rules";

// ─────────────────────────────────────────────
// Sending to phones through Firebase Cloud Messaging.
//
// Credentials: FIREBASE_SERVICE_ACCOUNT = the service-account JSON key, base64
// encoded (one line, so it survives .env files and hosting dashboards).
// Without it, sends are logged and skipped — the rest of the app works.
// ─────────────────────────────────────────────

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  url: string;
  kind: string;
}

/** Send one message. Resolves "ok", "dead" (token no longer valid → delete it) or "error". */
export type Sender = (m: PushMessage) => Promise<"ok" | "dead" | "error">;

/** FCM error codes that mean the app was uninstalled or the token is garbage. */
const DEAD_TOKEN = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);

/**
 * Is this send error about the device token (→ delete it)? "invalid-argument" is
 * only a dead token when the message says so; otherwise it's a bug in our payload,
 * and deleting the user's phone would silently stop all their notifications.
 */
export function isDeadTokenError(code: string, message = ""): boolean {
  if (DEAD_TOKEN.has(code)) return true;
  return code === "messaging/invalid-argument" && /registration token/i.test(message);
}

let sender: Sender | null = null;

/** Tests swap in a fake sender. */
export function setSender(s: Sender | null) {
  sender = s;
}

export function pushConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT;
}

async function firebaseSender(): Promise<Sender | null> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  // Imported lazily so routes that never send don't load the Firebase SDK.
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getMessaging } = await import("firebase-admin/messaging");
  const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(Buffer.from(raw, "base64").toString("utf8"))) });
  const messaging = getMessaging(app);
  return async (m) => {
    try {
      await messaging.send({
        token: m.token,
        notification: { title: m.title, body: m.body },
        data: { url: m.url, kind: m.kind },
        android: {
          priority: "high",
          // Same kind replaces the older one in the tray instead of stacking.
          notification: { tag: m.kind, channelId: "reminders", color: "#F97316" },
        },
      });
      return "ok";
    } catch (e) {
      const { code = "", message = "" } = e as { code?: string; message?: string };
      if (isDeadTokenError(code, message)) return "dead";
      console.error("[push] send failed:", code || e);
      return "error";
    }
  };
}

async function getSender(): Promise<Sender | null> {
  if (!sender) sender = await firebaseSender();
  return sender;
}

export async function hasDevices(userId: string): Promise<boolean> {
  return (await prisma.pushDevice.count({ where: { userId } })) > 0;
}

/**
 * Send notifications to every device of a user. Dead tokens are deleted.
 * Returns how many messages were delivered to FCM.
 */
export async function sendToUser(userId: string, notifications: Notification[]): Promise<number> {
  if (notifications.length === 0) return 0;
  const devices = await prisma.pushDevice.findMany({ where: { userId }, select: { id: true, token: true } });
  if (devices.length === 0) return 0;
  const send = await getSender();
  if (!send) {
    console.info(`[push] not configured; would send ${notifications.map((n) => n.kind).join(", ")} to ${userId}`);
    return 0;
  }
  let delivered = 0;
  const dead: string[] = [];
  for (const d of devices) {
    for (const n of notifications) {
      const r = await send({ token: d.token, title: n.title, body: n.body, url: n.url, kind: n.kind });
      if (r === "ok") delivered++;
      if (r === "dead") {
        dead.push(d.id);
        break;
      }
    }
  }
  if (dead.length) await prisma.pushDevice.deleteMany({ where: { id: { in: dead } } });
  return delivered;
}
