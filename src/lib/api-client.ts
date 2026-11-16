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

export async function api<T = unknown>(
  url: string,
  opts: { method?: Method; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
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
  return json.data as T;
}

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
