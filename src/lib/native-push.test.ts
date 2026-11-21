import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./native-push";
import { isMealLog } from "./api-client";

describe("notification tap targets", () => {
  it("only opens screens inside Daystrong", () => {
    expect(safeInternalPath("/nutrition")).toBe("/nutrition");
    expect(safeInternalPath("/dashboard?x=1")).toBe("/dashboard?x=1");
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("//evil.example/path")).toBeNull();
    expect(safeInternalPath("/\\evil.example")).toBeNull(); // browsers treat "/\" like "//"
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
});

describe("which requests count as logging a meal", () => {
  it("adding food in any way", () => {
    expect(isMealLog("/api/nutrition/meals")).toBe(true);
    expect(isMealLog("/api/nutrition/meals/quick-add")).toBe(true);
    expect(isMealLog("/api/nutrition/meals/ai")).toBe(true);
    expect(isMealLog("/api/nutrition/saved-meals/abc123/log")).toBe(true);
  });
  it("not editing, deleting or saving a meal template", () => {
    expect(isMealLog("/api/nutrition/meals/item123")).toBe(false);
    expect(isMealLog("/api/nutrition/saved-meals")).toBe(false);
    expect(isMealLog("/api/nutrition/water")).toBe(false);
  });
});
