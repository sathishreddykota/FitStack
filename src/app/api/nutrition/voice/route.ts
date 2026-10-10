import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { createCustomFood, addFoodToMeal } from "@/services/nutrition.service";
import type { MealType } from "@/types/nutrition.types";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export const maxDuration = 60;

const FoodItemSchema = z.object({
  name: z.string().describe("Name of the food, e.g., 'Rice', 'Eggs'"),
  quantityG: z.number().describe("Estimated weight in grams. E.g. '3 eggs' -> 150"),
  calories: z.number().describe("Total calories for this quantity"),
  proteinG: z.number().describe("Total protein in grams"),
  carbsG: z.number().describe("Total carbs in grams"),
  fatG: z.number().describe("Total fats in grams"),
  fiberG: z.number().describe("Total fiber in grams (0 if none)"),
});

const VoiceLogSchema = z.object({
  items: z.array(FoodItemSchema).describe("List of parsed food items"),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getInternalUserId();
    const { transcript, mealType, date } = await req.json();

    if (!transcript || !mealType || !date) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
      return NextResponse.json({ success: false, error: "GEMINI_API_KEY is missing." }, { status: 500 });
    }

    const { object } = await generateObject({
      model: google("gemini-flash-lite-latest"), // Using robust model for structured output
      schema: VoiceLogSchema,
      prompt: `You are a nutrition expert parsing a voice log for a meal.
User says: "${transcript}"

Extract all food items mentioned. For each item:
1. Estimate the exact quantity in grams based on standard serving sizes if they use natural language (e.g. "3 eggs" = 150g, "1 banana" = 118g).
2. Accurately estimate the total calories, protein, carbs, fats, and fiber for THAT specific quantity of food.
Return the structured list.`,
    });

    const [y, m, d] = date.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(y, m - 1, d));

    // Save to DB
    const addedItems = [];

    for (const item of object.items) {
      if (item.quantityG <= 0) continue;
      
      const ratio = item.quantityG / 100;
      
      const food = await createCustomFood({
        userId,
        name: item.name + " (Voice Log)",
        category: "OTHER",
        caloriesPer100g: ratio > 0 ? item.calories / ratio : 0,
        proteinPer100g: ratio > 0 ? item.proteinG / ratio : 0,
        carbsPer100g: ratio > 0 ? item.carbsG / ratio : 0,
        fatPer100g: ratio > 0 ? item.fatG / ratio : 0,
        fiberPer100g: ratio > 0 ? item.fiberG / ratio : 0,
        defaultServingSizeG: item.quantityG,
        defaultServingUnit: "g"
      });

      const { item: savedItem } = await addFoodToMeal({
        userId,
        foodId: food.id,
        mealType: mealType as MealType,
        date: parsedDate,
        quantityG: item.quantityG,
        servingUnit: "g",
        notes: "Logged via Voice",
      });
      
      addedItems.push(savedItem);
    }

    return NextResponse.json({ success: true, data: addedItems });

  } catch (error: any) {
    console.error("[POST /api/nutrition/voice]", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process voice log" }, { status: 500 });
  }
}
