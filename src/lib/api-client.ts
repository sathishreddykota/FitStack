// ─────────────────────────────────────────────
// Typed client for FitStack API routes (web now, reusable by a native shell).
// Every route answers { success: true, data } or { success: false, error, code }.
// ─────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
  get isProRequired() {
    return this.code === "PRO_REQUIRED";
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** POSTs that add food to a day: search/quick add/AI log, and logging a saved meal. */
export const isMealLog = (url: string) => /^\/api\/nutrition\/(meals(\/quick-add|\/ai)?|saved-meals\/[^/]+\/log)(\?|$)/.test(url);

export async function api<T = unknown>(
  url: string,
  opts: { method?: Method; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const method = opts.method ?? (opts.body === undefined ? "GET" : "POST");
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Network error. Check your connection and try again.", 0, "NETWORK");
  }

  let json: { success?: boolean; data?: T; error?: string; code?: string; details?: unknown } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || !json?.success) {
    throw new ApiError(json?.error ?? `Request failed (${res.status}).`, res.status, json?.code, json?.details);
  }
  if (method === "POST" && isMealLog(url) && typeof window !== "undefined") {
    // The Android app uses this to offer notifications after the first meal is logged.
    window.dispatchEvent(new Event("fitstack:meal-logged"));
  }
  return json.data as T;
}

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
