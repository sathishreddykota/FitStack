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

const ParsedItem = z.object({
  name: z.string().min(1).max(80).describe("Common name of the food, singular, no quantity. e.g. 'Boiled Egg', 'Chapati', 'Dal Tadka'"),
  quantity: z.number().positive().max(5000).describe("How much, in `unit`. '3 eggs' → 3, '200g rice' → 200"),
  unit: z.enum(ALL_UNITS as [string, ...string[]]).describe("Unit for quantity. Use piece for countable items"),
  gramsPerUnit: z.number().positive().max(2000).describe("Estimated grams in ONE unit (1 egg ≈ 50, 1 chapati ≈ 40, 1 g = 1)"),
  caloriesPer100g: z.number().min(0).max(900),
  proteinPer100g: z.number().min(0).max(100),
  carbsPer100g: z.number().min(0).max(100),
  fatPer100g: z.number().min(0).max(100),
  fiberPer100g: z.number().min(0).max(100),
});
const ParsedMeal = z.object({ items: z.array(ParsedItem).max(15) });

export type ParsedFood = z.infer<typeof ParsedItem>;

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
  return output.items;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Pick an existing food that clearly is the same thing, or null. */
export function pickMatch(name: string, candidates: Pick<FoodResult, "name" | "isVerified" | "createdByUserId">[], userId: string) {
  const target = normalize(name);
  if (!target) return null;
  const exact = candidates.find((c) => normalize(c.name) === target);
  if (exact) return exact;
  // "white rice" ↔ "White Rice (Cooked)" — prefix match on verified or the user's own foods only.
  return (
    candidates.find(
      (c) => (c.isVerified || c.createdByUserId === userId) && normalize(c.name).startsWith(target + " "),
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
