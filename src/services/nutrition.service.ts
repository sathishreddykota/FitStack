// ─────────────────────────────────────────────
// Nutrition Service
// All DB operations for food + meal logging.
// ─────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import type { MealType, ServingUnit } from "@/types/nutrition.types";

// ── Food Search ────────────────────────────────────────────────────

export interface FoodSearchParams {
  query: string;
  category?: string;
  limit?: number;
  userId?: string; // include user's custom foods
}

export async function searchFoods(params: FoodSearchParams) {
  const { query, limit = 20, userId } = params;

  const foods = await prisma.food.findMany({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { isPublic: true },
            ...(userId ? [{ createdByUserId: userId }] : []),
          ],
        },
      ],
    },
    orderBy: [
      // Verified foods first, then alphabetical
      { isVerified: "desc" },
      { name: "asc" },
    ],
    take: limit,
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      caloriesPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
      fiberPer100g: true,
      defaultServingSizeG: true,
      defaultServingUnit: true,
      isVerified: true,
      createdByUserId: true,
    },
  });

  return foods;
}

// ── Get Daily Meals ─────────────────────────────────────────────────

export async function getDayMeals(userId: string, date: Date) {
  const dayStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  const meals = await prisma.meal.findMany({
    where: { userId, date: dayStart },
    include: {
      items: {
        include: { food: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { mealType: "asc" },
  });

  return meals;
}

// ── Add Food to Meal ────────────────────────────────────────────────

export interface AddFoodInput {
  userId: string;
  foodId: string;
  mealType: MealType;
  date: Date;
  quantityG: number;
  servingUnit: ServingUnit;
  notes?: string;
}

export async function addFoodToMeal(input: AddFoodInput) {
  const { userId, foodId, mealType, date, quantityG, servingUnit, notes } = input;

  // Verify the food exists and is accessible
  const food = await prisma.food.findFirst({
    where: {
      id: foodId,
      OR: [{ isPublic: true }, { createdByUserId: userId }],
    },
  });

  if (!food) {
    throw new Error("Food not found or not accessible.");
  }

  // Calculate nutrition at log time (snapshot from per-100g values)
  const ratio = quantityG / 100;
  const calories = food.caloriesPer100g * ratio;
  const proteinG = food.proteinPer100g * ratio;
  const carbsG = food.carbsPer100g * ratio;
  const fatG = food.fatPer100g * ratio;
  const fiberG = food.fiberPer100g != null ? food.fiberPer100g * ratio : null;

  const dayStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // Upsert meal (create if it doesn't exist for this meal type + date)
  const meal = await prisma.meal.upsert({
    where: {
      userId_date_mealType: {
        userId,
        date: dayStart,
        mealType,
      },
    },
    create: { userId, date: dayStart, mealType },
    update: {},
  });

  // Create the meal item
  const item = await prisma.mealItem.create({
    data: {
      mealId: meal.id,
      foodId,
      quantityG,
      servingUnit,
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      notes: notes ?? null,
    },
    include: { food: true },
  });

  return { meal, item };
}

// ── Quick Add Macros ────────────────────────────────────────────────

export interface QuickAddMacrosInput {
  userId: string;
  mealType: MealType;
  date: Date;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export async function quickAddMacros(input: QuickAddMacrosInput) {
  const { userId, mealType, date, calories, proteinG, carbsG, fatG } = input;

  // Find or create a generic "Quick Add" food for this user
  let quickAddFood = await prisma.food.findFirst({
    where: { createdByUserId: userId, name: "Quick Add Macros" },
  });

  if (!quickAddFood) {
    quickAddFood = await prisma.food.create({
      data: {
        name: "Quick Add Macros",
        category: "OTHER",
        caloriesPer100g: 0,
        proteinPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 0,
        defaultServingSizeG: 1,
        defaultServingUnit: "serving",
        isPublic: false,
        createdByUserId: userId,
      },
    });
  }

  const dayStart = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  const meal = await prisma.meal.upsert({
    where: {
      userId_date_mealType: {
        userId,
        date: dayStart,
        mealType,
      },
    },
    create: { userId, date: dayStart, mealType },
    update: {},
  });

  // Create the meal item directly with the macros
  const item = await prisma.mealItem.create({
    data: {
      mealId: meal.id,
      foodId: quickAddFood.id,
      quantityG: 1,
      servingUnit: "serving",
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG: 0,
    },
    include: { food: true },
  });

  return { meal, item };
}

// ── Update Meal Item ────────────────────────────────────────────────

export interface UpdateMealItemInput {
  itemId: string;
  userId: string;
  quantityG: number;
  servingUnit: ServingUnit;
  notes?: string;
}

export async function updateMealItem(input: UpdateMealItemInput) {
  const { itemId, userId, quantityG, servingUnit, notes } = input;

  // Verify ownership via meal → userId
  const existing = await prisma.mealItem.findFirst({
    where: { id: itemId },
    include: { meal: true, food: true },
  });

  if (!existing || existing.meal.userId !== userId) {
    throw new Error("Meal item not found or unauthorized.");
  }

  // Recalculate nutrition snapshot
  const food = existing.food;
  const ratio = quantityG / 100;

  const updated = await prisma.mealItem.update({
    where: { id: itemId },
    data: {
      quantityG,
      servingUnit,
      calories: food.caloriesPer100g * ratio,
      proteinG: food.proteinPer100g * ratio,
      carbsG: food.carbsPer100g * ratio,
      fatG: food.fatPer100g * ratio,
      fiberG: food.fiberPer100g != null ? food.fiberPer100g * ratio : null,
      notes: notes ?? null,
    },
    include: { food: true },
  });

  return updated;
}

// ── Delete Meal Item ────────────────────────────────────────────────

export async function deleteMealItem(itemId: string, userId: string) {
  // Verify ownership
  const item = await prisma.mealItem.findFirst({
    where: { id: itemId },
    include: { meal: { select: { userId: true } } },
  });

  if (!item || item.meal.userId !== userId) {
    throw new Error("Meal item not found or unauthorized.");
  }

  await prisma.mealItem.delete({ where: { id: itemId } });

  // Clean up empty meals (optional — keeps DB tidy)
  const remaining = await prisma.mealItem.count({
    where: { mealId: item.mealId },
  });

  if (remaining === 0) {
    await prisma.meal.delete({ where: { id: item.mealId } });
  }

  return { deleted: true };
}

// ── Create Custom Food ──────────────────────────────────────────────

export interface CreateFoodInput {
  userId: string;
  name: string;
  brand?: string;
  category?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  defaultServingSizeG?: number;
  defaultServingUnit?: ServingUnit;
}

export async function createCustomFood(input: CreateFoodInput) {
  const food = await prisma.food.create({
    data: {
      name: input.name,
      brand: input.brand ?? null,
      category: (input.category as never) ?? "OTHER",
      caloriesPer100g: input.caloriesPer100g,
      proteinPer100g: input.proteinPer100g,
      carbsPer100g: input.carbsPer100g,
      fatPer100g: input.fatPer100g,
      fiberPer100g: input.fiberPer100g ?? null,
      defaultServingSizeG: input.defaultServingSizeG ?? 100,
      defaultServingUnit: (input.defaultServingUnit as never) ?? "g",
      isPublic: false, // custom foods are private
      isVerified: false,
      createdByUserId: input.userId,
    },
  });

  return food;
}

// ── Daily Nutrition Summary Helper ──────────────────────────────────

export function calcDailyTotals(meals: Awaited<ReturnType<typeof getDayMeals>>) {
  let calories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberG = 0;

  for (const meal of meals) {
    for (const item of meal.items) {
      calories += item.calories;
      proteinG += item.proteinG;
      carbsG += item.carbsG;
      fatG += item.fatG;
      fiberG += item.fiberG ?? 0;
    }
  }

  return {
    calories: Math.round(calories),
    proteinG: Math.round(proteinG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    fiberG: Math.round(fiberG * 10) / 10,
  };
}
