import { z } from "zod";

// ─────────────────────────────────────────────
// Date handling — ONE rule for the whole app:
//
//   Every calendar day ("@db.Date" columns) is the user's LOCAL day,
//   stored as UTC midnight of that day (2026-11-16 → 2026-11-16T00:00:00Z).
//
// "Today" is always computed from the user's IANA timezone (profile.timezone),
// never from the server clock, so a UTC server shows Indian users the right day.
// ─────────────────────────────────────────────

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Is this a real IANA timezone name the runtime understands? */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function safeTimezone(tz: string | null | undefined): string {
  return tz && isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
}

/** "YYYY-MM-DD" for the given instant as seen in `tz`. */
export function localDateString(tz: string, at: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function isValidDateString(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** "YYYY-MM-DD" → Date at UTC midnight (value to store in / query @db.Date columns). */
export function toDbDate(dateStr: string): Date {
  if (!isValidDateString(dateStr)) throw new Error(`Invalid date: ${dateStr}`);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** @db.Date value → "YYYY-MM-DD". */
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = toDbDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return fromDbDate(d);
}

/** Inclusive list of day strings from `from` to `to`. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let cur = from; cur <= to; cur = addDays(cur, 1)) out.push(cur);
  return out;
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(dateStr: string): number {
  return (toDbDate(dateStr).getUTCDay() + 6) % 7;
}

export function startOfWeek(dateStr: string): string {
  return addDays(dateStr, -weekdayIndex(dateStr));
}

export function startOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export function endOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return fromDbDate(new Date(Date.UTC(y, m, 0)));
}

/** Days between two day strings (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toDbDate(b).getTime() - toDbDate(a).getTime()) / 86_400_000);
}

/** zod schema for a "YYYY-MM-DD" field. */
export const dateStringSchema = z
  .string()
  .refine(isValidDateString, { message: "Use a valid date in YYYY-MM-DD format" });

/** "Today" for a user, as both a string and a DB value. */
export function userToday(tz: string | null | undefined, at: Date = new Date()) {
  const str = localDateString(safeTimezone(tz), at);
  return { str, db: toDbDate(str) };
}

/** Short label like "16 Nov" for a day string (timezone independent). */
export function shortLabel(dateStr: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    toDbDate(dateStr),
  );
}

/** Hour of day (0–23) for an instant in `tz`. */
export function localHour(tz: string, at: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: safeTimezone(tz) }).format(at));
}

/** Convert a wall-clock time in `tz` ("2026-11-17", "06:30") to the real instant. */
export function zonedToUtc(dateStr: string, time: string, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Offset of tz at that moment = what the wall clock shows minus UTC.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(tz),
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (shown - guess));
}
