import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

// ─────────────────────────────────────────────
// Class Name Utility
// ─────────────────────────────────────────────

/**
 * Merges Tailwind CSS classes safely, resolving conflicts.
 * Use this everywhere instead of manual string concatenation.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────
// Number Formatters
// ─────────────────────────────────────────────

/**
 * Format a number to a fixed decimal places, removing trailing zeros.
 * formatNum(2.5, 1) => "2.5"
 * formatNum(2.0, 1) => "2"
 */
export function formatNum(value: number, decimals = 1): string {
  return parseFloat(value.toFixed(decimals)).toString();
}

/**
 * Format a weight in kg with 1 decimal place.
 */
export function formatWeight(kg: number): string {
  return `${formatNum(kg, 1)} kg`;
}

/**
 * Format calories (no decimals).
 */
export function formatCalories(kcal: number): string {
  return `${Math.round(kcal)} kcal`;
}

/**
 * Format macro grams with 1 decimal.
 */
export function formatMacro(grams: number): string {
  return `${formatNum(grams, 1)}g`;
}

/**
 * Format millilitres to L when >= 1000.
 */
export function formatWater(ml: number): string {
  if (ml >= 1000) {
    return `${formatNum(ml / 1000, 2)}L`;
  }
  return `${Math.round(ml)}ml`;
}

/**
 * Format a percentage with 1 decimal.
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format height in cm to "X cm" or "X ft Y in" (cm always for now).
 */
export function formatHeight(cm: number): string {
  return `${cm} cm`;
}

/**
 * Format duration in minutes to "Xh Ym" or "Xm".
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─────────────────────────────────────────────
// Date Formatters
// ─────────────────────────────────────────────

/**
 * Format a date for display: "Mon, 10 Sep 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEE, d MMM yyyy");
}

/**
 * Format a date as short: "10 Sep"
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d MMM");
}

/**
 * Format a date as "Today", "Yesterday", or formatted date.
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return formatDate(d);
}

/**
 * Format a date as "X hours ago", "2 days ago", etc.
 */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Get a date string in YYYY-MM-DD format for API usage.
 */
export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Parse a YYYY-MM-DD string into a Date object (local time).
 */
export function fromDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// ─────────────────────────────────────────────
// Math Utilities
// ─────────────────────────────────────────────

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage, capped at 100%.
 */
export function calcPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return clamp((current / target) * 100, 0, 100);
}

/**
 * Calculate a rolling N-day average from an array of numbers.
 */
export function rollingAverage(values: number[], windowSize: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
  });
}

// ─────────────────────────────────────────────
// String Utilities
// ─────────────────────────────────────────────

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert SNAKE_CASE to "Title Case".
 */
export function snakeToTitleCase(str: string): string {
  return str
    .split("_")
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Truncate a string to maxLength and add "...".
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

// ─────────────────────────────────────────────
// Array Utilities
// ─────────────────────────────────────────────

/**
 * Group an array of objects by a key.
 */
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Get the last N items of an array.
 */
export function lastN<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(arr.length - n, 0));
}
