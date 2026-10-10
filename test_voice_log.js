require('dotenv').config({path: '.env.local'});
const { generateObject } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { z } = require('zod');

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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

async function test() {
  try {
    const { object } = await generateObject({
      model: google("gemini-flash-lite-latest"),
      schema: VoiceLogSchema,
      prompt: `You are a nutrition expert parsing a voice log for a meal.
User says: "3 eggs"

Extract all food items mentioned. For each item:
1. Estimate the exact quantity in grams based on standard serving sizes if they use natural language (e.g. "3 eggs" = 150g, "1 banana" = 118g).
2. Accurately estimate the total calories, protein, carbs, fats, and fiber for THAT specific quantity of food.
Return the structured list.`,
    });
    console.log(JSON.stringify(object, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}
test();
