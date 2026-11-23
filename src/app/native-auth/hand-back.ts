"use client";

/**
 * Link back into the app. An Android "intent:" link names the app's package, so
 * Chrome hands it only to Daystrong. It carries just the hand-off id — useless
 * without the secret the app kept.
 */
export const appLink = (id: string) => `intent://auth?id=${id}#Intent;scheme=com.daystrong.app;package=com.daystrong.app;end`;

interface SessionLike {
  getToken(): Promise<string | null>;
}

/**
 * Tell the server which user finished Google sign-in for this hand-off, then open
 * the app. Sends the Clerk session token in the Authorization header instead of
 * relying on cookies: in this browser tab the session can exist on the page before
 * any cookie the server would read does.
 */
export async function completeAndReturn(session: SessionLike, id: string) {
  const token = await session.getToken();
  if (!token) throw new Error("No session token.");
  const res = await fetch("/api/native-auth/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`complete failed (${res.status})`);
  window.location.href = appLink(id);
}
