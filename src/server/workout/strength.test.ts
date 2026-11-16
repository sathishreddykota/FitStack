import { describe, expect, it } from "vitest";
import { estimate1RM, isNewPR, volumeOf } from "./strength";

describe("strength", () => {
  it("estimates 1RM", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBe(112.5); // Brzycki
    expect(estimate1RM(60, 15)).toBe(90); // Epley
    expect(estimate1RM(0, 5)).toBe(0);
  });

  it("only counts completed sets toward volume", () => {
    expect(
      volumeOf([
        { weightKg: 100, reps: 5, completedAt: new Date() },
        { weightKg: 100, reps: 5, completedAt: null },
        { weightKg: null, reps: 10, completedAt: new Date() },
      ]),
    ).toBe(500);
  });

  it("detects PRs by estimated 1RM, not raw weight", () => {
    // 90 × 8 (e1RM ≈ 111.7) beats a previous best of 100 × 3 (e1RM ≈ 105.9)
    expect(isNewPR({ weightKg: 90, reps: 8 }, estimate1RM(100, 3))).toBe(true);
    expect(isNewPR({ weightKg: 90, reps: 2 }, estimate1RM(100, 3))).toBe(false);
  });
});
