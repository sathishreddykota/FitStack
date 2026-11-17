import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { MealType } from "@prisma/client";
import { aiModel, quoteUserText, USER_TEXT_RULE } from "../ai";
import { HttpError } from "../http";
import { ALL_UNITS } from "./units";
import { createCustomFood, logFood, searchFoods, type FoodResult } from "./service";

// ─────────────────────────────────────────────
// "Magic" food logging: free text / voice transcript → logged meal items.
// Existing foods (verified DB + the user's own) are matched first; a private
// food is only created when nothing matches, and is reused next time.
// ─────────────────────────────────────────────

// Keep the schema sent to the model PLAIN: Gemini rejects structured-output schemas with
// numeric min/max bounds ("too many states for serving"). Limits are enforced after parsing.
const ParsedItem = z.object({
  name: z.string().describe("Common name of the food, singular, no quantity. e.g. 'Boiled Egg', 'Chapati', 'Dal Tadka'"),
  quantity: z.number().describe("How much, in `unit`. '3 eggs' → 3, '200g rice' → 200"),
  unit: z.enum(ALL_UNITS as [string, ...string[]]).describe("Unit for quantity. Use piece for countable items"),
  gramsPerUnit: z.number().describe("Estimated grams in ONE unit (1 egg ≈ 50, 1 chapati ≈ 40, 1 g = 1)"),
  caloriesPer100g: z.number(),
  proteinPer100g: z.number(),
  carbsPer100g: z.number(),
  fatPer100g: z.number(),
  fiberPer100g: z.number(),
});
const ParsedMeal = z.object({ items: z.array(ParsedItem) });

export type ParsedFood = z.infer<typeof ParsedItem>;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

/** Enforce sane limits on model output; drops items that can't be logged. */
export function sanitizeParsedFoods(items: ParsedFood[]): ParsedFood[] {
  return items
    .filter((i) => i.name?.trim() && i.quantity > 0 && i.gramsPerUnit > 0)
    .slice(0, 15)
    .map((i) => ({
      ...i,
      name: i.name.trim().slice(0, 80),
      quantity: clamp(i.quantity, 0.1, 5000),
      gramsPerUnit: clamp(i.gramsPerUnit, 0.1, 2000),
      caloriesPer100g: clamp(i.caloriesPer100g, 0, 900),
      proteinPer100g: clamp(i.proteinPer100g, 0, 100),
      carbsPer100g: clamp(i.carbsPer100g, 0, 100),
      fatPer100g: clamp(i.fatPer100g, 0, 100),
      fiberPer100g: clamp(i.fiberPer100g, 0, 100),
    }));
}

export async function parseFoodText(text: string): Promise<ParsedFood[]> {
  const { output } = await generateText({
    model: aiModel(),
    output: Output.object({ schema: ParsedMeal }),
    system: [
      "You are a nutrition expert for an Indian fitness app. Extract every food or drink the user ate.",
      "Use typical Indian home-style values when a dish is Indian. Give nutrition PER 100 g of the food as eaten.",
      "If nothing edible is mentioned, return an empty list.",
      USER_TEXT_RULE,
    ].join("\n"),
    prompt: quoteUserText(text, 600),
  });
  return sanitizeParsedFoods(output.items);
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "Roti / Chapati (1 piece)" → ["roti", "chapati"] — each part of a slash name is an alias. */
const aliases = (s: string) =>
  s
    .replace(/\(.*?\)/g, " ")
    .split("/")
    .map(normalize)
    .filter(Boolean);

/** Pick an existing food that clearly is the same thing, or null. */
export function pickMatch<C extends Pick<FoodResult, "name" | "isVerified" | "createdByUserId">>(
  name: string,
  candidates: C[],
  userId: string,
): C | null {
  const target = normalize(name);
  if (!target) return null;
  const trusted = (c: C) => c.isVerified || c.createdByUserId === userId;

  // 1. Same name, or same as one of its aliases ("chapati" ↔ "Roti / Chapati").
  const exact = candidates.find((c) => normalize(c.name) === target || aliases(c.name).includes(target));
  if (exact) return exact;

  // Single words stay strict from here on, so "dal" never becomes "Dal Makhani".
  const words = target.split(" ");
  if (words.length < 2) return null;

  // 2. Exactly one extra word anywhere: "dal tadka" ↔ "Yellow Dal Tadka", "brown rice" ↔ "Brown Rice Basmati".
  //    More extra words usually means a different dish ("Paneer Tikka Masala Gravy").
  return (
    candidates.find(
      (c) =>
        trusted(c) &&
        aliases(c.name).some((a) => {
          const aw = a.split(" ");
          return aw.length === words.length + 1 && words.every((w) => aw.includes(w));
        }),
    ) ?? null
  );
}

export async function logFoodFromText(userId: string, input: { text: string; mealType: MealType; date: string }) {
  let items: ParsedFood[];
  try {
    items = await parseFoodText(input.text);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error("[ai-food-parse]", err);
    throw new HttpError(502, "Couldn't understand that. Try e.g. '2 chapati and 1 bowl dal'.", "AI_UNAVAILABLE");
  }
  if (items.length === 0) {
    throw new HttpError(422, "No food found in that text. Try e.g. '3 eggs and a banana'.", "VALIDATION");
  }

  const logged: { name: string; matched: boolean; calories: number }[] = [];
  for (const item of items) {
    const unit = item.unit as (typeof ALL_UNITS)[number];
    const candidates = await searchFoods(userId, item.name, 8);
    const match = pickMatch(item.name, candidates, userId);

    let foodId: string;
    let quantity = item.quantity;
    let logUnit = unit;
    if (match) {
      foodId = (match as FoodResult).id;
      // Count units depend on the food's own serving size; when the matched food has none,
      // log the AI's gram estimate so "2 eggs" never becomes "2 × 100 g".
      const m = match as FoodResult;
      const hasOwnSize =
        m.servings.some((s) => s.unit === unit) ||
        m.defaultServingUnit === unit ||
        ["g", "kg", "ml", "L", "cup", "tbsp", "tsp"].includes(unit);
      if (!hasOwnSize) {
        quantity = Math.round(item.quantity * item.gramsPerUnit);
        logUnit = "g";
      }
    } else {
      const food = await createCustomFood(userId, {
        name: item.name,
        brand: "AI estimate",
        caloriesPer100g: item.caloriesPer100g,
        proteinPer100g: item.proteinPer100g,
        carbsPer100g: item.carbsPer100g,
        fatPer100g: item.fatPer100g,
        fiberPer100g: item.fiberPer100g,
        defaultServingSizeG: item.gramsPerUnit,
        defaultServingUnit: ["piece", "slice", "serving", "scoop"].includes(unit) ? unit : "g",
      });
      foodId = food.id;
    }

    const row = await logFood(userId, {
      foodId,
      mealType: input.mealType,
      date: input.date,
      quantity,
      unit: logUnit,
      notes: "Logged with AI",
    });
    logged.push({ name: item.name, matched: !!match, calories: Math.round(row.calories) });
  }
  return logged;
}
