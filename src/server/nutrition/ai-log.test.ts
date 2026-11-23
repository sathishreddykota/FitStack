import { describe, expect, it } from "vitest";
import { pickMatch, sanitizeParsedFoods } from "./ai-log";

const item = (o: Partial<Parameters<typeof sanitizeParsedFoods>[0][number]> = {}) => ({
  name: "Chapati",
  quantity: 3,
  unit: "piece",
  gramsPerUnit: 40,
  caloriesPer100g: 297,
  proteinPer100g: 9.8,
  carbsPer100g: 46,
  fatPer100g: 7.5,
  fiberPer100g: 4,
  ...o,
});

describe("sanitizeParsedFoods", () => {
  it("drops unusable items and clamps silly numbers", () => {
    const out = sanitizeParsedFoods([
      item(),
      item({ name: " " }),
      item({ quantity: 0 }),
      item({ name: "Ghee", caloriesPer100g: 5000, fatPer100g: 120, quantity: 99999 }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ caloriesPer100g: 900, fatPer100g: 100, quantity: 5000 });
  });

  it("caps the number of items", () => {
    expect(sanitizeParsedFoods(Array.from({ length: 30 }, () => item()))).toHaveLength(15);
  });
});

describe("pickMatch", () => {
  const c = (name: string, isVerified = true, createdByUserId: string | null = null) => ({ name, isVerified, createdByUserId });
  it("matches exact names and verified prefix matches only", () => {
    expect(pickMatch("white rice", [c("White Rice (Cooked)")], "u")?.name).toBe("White Rice (Cooked)");
    expect(pickMatch("dal", [c("Dal Makhani", false, "other")], "u")).toBeNull();
    expect(pickMatch("Boiled Egg", [c("Egg Bhurji"), c("Boiled Egg")], "u")?.name).toBe("Boiled Egg");
  });

  it("understands slash aliases and one extra word on multi-word names", () => {
    expect(pickMatch("Chapati", [c("Roti / Chapati")], "u")?.name).toBe("Roti / Chapati");
    expect(pickMatch("roti", [c("Wheat Roti / Chapati (1 piece ~40g)")], "u")).toBeNull(); // "wheat roti" ≠ "roti"
    expect(pickMatch("Dal Tadka", [c("Dal Makhani"), c("Yellow Dal Tadka")], "u")?.name).toBe("Yellow Dal Tadka");
    expect(pickMatch("dal", [c("Dal Makhani"), c("Toor Dal (Cooked)")], "u")).toBeNull();
    expect(pickMatch("paneer tikka", [c("Paneer Tikka Masala Gravy")], "u")).toBeNull(); // two extra words
  });
});
