import { ok, route } from "@/server/http";
import { beginHandoff } from "@/server/native-auth";

// POST /api/native-auth/begin — the Android app starts a Google sign-in (signed out, so public).
// Returns { id, verifier }: the app opens the browser tab with `id` and keeps `verifier`.
export const POST = route("POST /api/native-auth/begin", async () => ok(await beginHandoff()));
