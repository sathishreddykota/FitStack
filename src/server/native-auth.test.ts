/**
 * Google sign-in hand-off for the Android app, against a real Postgres.
 * Skipped unless TEST_DATABASE_URL is set.
 */
import { describe, expect, it, vi } from "vitest";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: null }),
  currentUser: async () => null,
  clerkClient: async () => ({ signInTokens: { createSignInToken: async ({ userId }: { userId: string }) => ({ token: `ticket-for-${userId}` }) } }),
}));

describe.skipIf(!url)("native sign-in hand-off", async () => {
  const h = await import("./native-auth");
  const claimRoute = await import("@/app/api/native-auth/claim/route");
  const beginRoute = await import("@/app/api/native-auth/begin/route");

  const post = async (handler: unknown, body?: unknown) => {
    const res = await (handler as (r: Request, c: unknown) => Promise<Response>)(
      new Request("http://localhost/x", { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }),
      {},
    );
    return { status: res.status, json: await res.json() };
  };

  it("happy path: begin → Google done → app claims once and gets a ticket", async () => {
    const b = await post(beginRoute.POST);
    expect(b.status).toBe(200);
    const { id, verifier } = b.json.data;
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await h.completeHandoff(id, "user_google_1")).toBe(true);
    const c = await post(claimRoute.POST, { id, verifier });
    expect(c.status).toBe(200);
    expect(c.json.data.ticket).toBe("ticket-for-user_google_1");
    // Second claim: gone.
    expect((await post(claimRoute.POST, { id, verifier })).status).toBe(400);
  });

  it("the id alone (what passes through the browser and the app link) is not enough", async () => {
    const { id } = await h.beginHandoff();
    await h.completeHandoff(id, "user_google_2");
    const wrong = "x".repeat(43);
    expect(await h.claimHandoff(id, wrong)).toBeNull();
    // A wrong guess doesn't burn it for the real app.
    expect(await h.claimHandoff(id, "y".repeat(43))).toBeNull();
  });

  it("can't claim before Google finished, and the first finisher wins", async () => {
    const { id, verifier } = await h.beginHandoff();
    expect(await h.claimHandoff(id, verifier)).toBeNull(); // not completed yet
    expect(await h.completeHandoff(id, "user_a")).toBe(true);
    expect(await h.completeHandoff(id, "user_b")).toBe(false); // can't be re-pointed
    expect(await h.claimHandoff(id, verifier)).toBe("user_a");
  });

  it("expires", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const { id, verifier } = await h.beginHandoff(t0);
    const late = new Date(t0.getTime() + h.HANDOFF_TTL_MS + 1000);
    expect(await h.completeHandoff(id, "user_c", late)).toBe(false);
    await h.completeHandoff(id, "user_c", t0);
    expect(await h.claimHandoff(id, verifier, late)).toBeNull();
  });

  it("rejects malformed claims", async () => {
    expect((await post(claimRoute.POST, { id: "short", verifier: "v" })).status).toBe(400);
    expect((await post(claimRoute.POST, {})).status).toBe(400);
  });
});
