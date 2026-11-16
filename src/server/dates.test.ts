import { describe, expect, it } from "vitest";
import {
  addDays,
  eachDay,
  endOfMonth,
  isValidDateString,
  localDateString,
  startOfWeek,
  toDbDate,
  fromDbDate,
  userToday,
} from "./dates";

describe("dates", () => {
  it("computes today in the user's timezone, not the server's", () => {
    // 20:00 UTC on 16 Nov is already 17 Nov 01:30 in India
    const at = new Date("2026-11-16T20:00:00Z");
    expect(localDateString("Asia/Kolkata", at)).toBe("2026-11-17");
    expect(localDateString("America/New_York", at)).toBe("2026-11-16");
    expect(userToday("Asia/Kolkata", at).db.toISOString()).toBe("2026-11-17T00:00:00.000Z");
  });

  it("falls back to India time for a bad timezone", () => {
    const at = new Date("2026-11-16T20:00:00Z");
    expect(userToday("Not/AZone", at).str).toBe("2026-11-17");
  });

  it("round-trips DB dates", () => {
    expect(fromDbDate(toDbDate("2026-02-28"))).toBe("2026-02-28");
  });

  it("validates calendar dates", () => {
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2028-02-29")).toBe(true);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("16-11-2026")).toBe(false);
  });

  it("does day arithmetic across months", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(eachDay("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
  });

  it("weeks start on Monday", () => {
    expect(startOfWeek("2026-11-16")).toBe("2026-11-16"); // Monday
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16"); // Sunday
  });
});
