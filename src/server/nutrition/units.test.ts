import { describe, expect, it } from "vitest";
import { gramsPerUnit, nutritionFor, toGrams } from "./units";

const rice = { defaultServingSizeG: 200, defaultServingUnit: "g" as const };
const dosa = { defaultServingSizeG: 150, defaultServingUnit: "piece" as const };
const whey = { defaultServingSizeG: 30, defaultServingUnit: "scoop" as const };

describe("units", () => {
  it("converts mass units exactly", () => {
    expect(toGrams(rice, 1.5, "kg")).toBe(1500);
    expect(toGrams(rice, 250, "g")).toBe(250);
  });

  it("converts volume units at ~1 g/ml", () => {
    expect(toGrams(rice, 1, "cup")).toBe(240);
    expect(toGrams(rice, 2, "tbsp")).toBe(30);
  });

  it("uses the food's default serving for count units", () => {
    expect(toGrams(dosa, 2, "piece")).toBe(300);
    expect(toGrams(whey, 1, "scoop")).toBe(30);
  });

  it("prefers a food-specific serving size", () => {
    const egg = { defaultServingSizeG: 100, defaultServingUnit: "g" as const, servings: [{ unit: "piece" as const, grams: 50 }] };
    expect(gramsPerUnit(egg, "piece")).toBe(50);
    expect(toGrams(egg, 3, "piece")).toBe(150);
  });

  it("never treats 1 cup as 1 gram (old bug)", () => {
    expect(toGrams(rice, 1, "cup")).not.toBe(1);
  });

  it("scales nutrition from per-100g values", () => {
    const n = nutritionFor(
      { caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28.2, fatPer100g: 0.3, fiberPer100g: null },
      250,
    );
    expect(n).toEqual({ calories: 325, proteinG: 6.8, carbsG: 70.5, fatG: 0.8, fiberG: null });
  });
});
