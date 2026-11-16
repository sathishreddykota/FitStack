import "server-only";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodTypeAny, type output } from "zod";

// ─────────────────────────────────────────────
// One response envelope for every API route (web + future native app):
//   success → { success: true,  data }
//   failure → { success: false, error, code?, details? }
// ─────────────────────────────────────────────

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "PRO_REQUIRED"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "AI_UNAVAILABLE"
  | "PAYMENT"
  | "INTERNAL";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: ErrorCode = "INTERNAL",
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new HttpError(404, `${what} not found.`, "NOT_FOUND");
export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, "VALIDATION", details);

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true as const, data }, init);
}

export function fail(status: number, error: string, code: ErrorCode, details?: unknown) {
  return NextResponse.json({ success: false as const, error, code, details }, { status });
}

/** Parse + validate a JSON body. Throws a 400 HttpError on bad input. */
export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw badRequest("Invalid request.", parsed.error.flatten());
  return parsed.data;
}

/** Parse + validate URL search params. */
export function parseQuery<S extends ZodTypeAny>(req: Request, schema: S): output<S> {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = schema.safeParse(params);
  if (!parsed.success) throw badRequest("Invalid query parameters.", parsed.error.flatten());
  return parsed.data;
}

/** Convert any thrown value into the standard error response. */
export function toErrorResponse(err: unknown, label = "API") {
  if (err instanceof HttpError) return fail(err.status, err.message, err.code, err.details);
  if (err instanceof ZodError) return fail(400, "Invalid request.", "VALIDATION", err.flatten());
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return fail(404, "Not found.", "NOT_FOUND");
    if (err.code === "P2002") return fail(409, "Already exists.", "CONFLICT");
    if (err.code === "P2003") return fail(400, "Referenced record does not exist.", "VALIDATION");
  }
  // Next.js uses thrown errors for redirect()/notFound(); let those through.
  if (err && typeof err === "object" && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_")) {
    throw err;
  }
  console.error(`[${label}]`, err);
  return fail(500, "Something went wrong. Please try again.", "INTERNAL");
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wrap a route handler so every error becomes a consistent JSON response. */
export function route<C = unknown>(label: string, handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toErrorResponse(err, label);
    }
  };
}
