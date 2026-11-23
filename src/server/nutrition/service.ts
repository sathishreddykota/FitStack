import "server-only";
import type { MealType, Prisma, ServingUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "../http";
import { toDbDate } from "../dates";
import { nutritionFor, toGrams } from "./units";

// ─────────────────────────────────────────────
// Nutrition: food search, meal logging, saved meals.
// Every function takes the internal userId and enforces ownership itself.
// ─────────────────────────────────────────────

const foodSelect = {
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
  servings: { select: { unit: true, grams: true, label: true } },
} satisfies Prisma.FoodSelect;

export type FoodResult = Prisma.FoodGetPayload<{ select: typeof foodSelect }>;

/** Foods visible to a user: public ones + their own private ones. */
function visibleTo(userId: string): Prisma.FoodWhereInput {
  return { OR: [{ isPublic: true }, { createdByUserId: userId }] };
}

export async function searchFoods(userId: string, query: string, limit = 25): Promise<FoodResult[]> {
  const q = query.trim();
  if (!q) return [];
  const foods = await prisma.food.findMany({
    where: {
      AND: [
        visibleTo(userId),
        { OR: [{ name: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }] },
        { name: { not: QUICK_ADD_NAME } },
      ],
    },
    orderBy: [{ isVerified: "desc" }, { name: "asc" }],
    take: Math.min(limit * 2, 100),
    select: foodSelect,
  });
  // Rank: exact match → starts-with → the user's own foods → the rest (stable).
  const lower = q.toLowerCase();
  const score = (f: FoodResult) => {
    const n = f.name.toLowerCase();
    if (n === lower) return 0;
    if (n.startsWith(lower)) return 1;
    if (f.createdByUserId === userId) return 2;
    return 3;
  };
  return foods
    .map((f, i) => ({ f, i, s: score(f) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.f);
}

export async function getDayMeals(userId: string, date: string) {
  return prisma.meal.findMany({
    where: { userId, date: toDbDate(date) },
    include: {
      items: {
        include: { food: { select: { id: true, name: true, brand: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { mealType: "asc" },
  });
}

export type DayMeals = Awaited<ReturnType<typeof getDayMeals>>;

export function dailyTotals(meals: { items: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number | null }[] }[]) {
  const t = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
  for (const meal of meals) {
    for (const i of meal.items) {
      t.calories += i.calories;
      t.proteinG += i.proteinG;
      t.carbsG += i.carbsG;
      t.fatG += i.fatG;
      t.fiberG += i.fiberG ?? 0;
    }
  }
  return {
    calories: Math.round(t.calories),
    proteinG: Math.round(t.proteinG * 10) / 10,
    carbsG: Math.round(t.carbsG * 10) / 10,
    fatG: Math.round(t.fatG * 10) / 10,
    fiberG: Math.round(t.fiberG * 10) / 10,
  };
}

async function ensureMeal(tx: Prisma.TransactionClient, userId: string, date: string, mealType: MealType) {
  const day = toDbDate(date);
  return tx.meal.upsert({
    where: { userId_date_mealType: { userId, date: day, mealType } },
    create: { userId, date: day, mealType },
    update: {},
  });
}

async function getVisibleFood(userId: string, foodId: string) {
  const food = await prisma.food.findFirst({
    where: { id: foodId, ...visibleTo(userId) },
    include: { servings: true },
  });
  if (!food) throw notFound("Food");
  return food;
}

export interface LogFoodInput {
  foodId: string;
  mealType: MealType;
  date: string;
  quantity: number;
  unit: ServingUnit;
  notes?: string;
}

export async function logFood(userId: string, input: LogFoodInput) {
  const food = await getVisibleFood(userId, input.foodId);
  const grams = toGrams(food, input.quantity, input.unit);
  return prisma.$transaction(async (tx) => {
    const meal = await ensureMeal(tx, userId, input.date, input.mealType);
    return tx.mealItem.create({
      data: {
        mealId: meal.id,
        foodId: food.id,
        quantity: input.quantity,
        servingUnit: input.unit,
        quantityG: grams,
        ...nutritionFor(food, grams),
        notes: input.notes ?? null,
      },
    });
  });
}

async function getOwnedItem(userId: string, itemId: string) {
  const item = await prisma.mealItem.findFirst({
    where: { id: itemId, meal: { userId } },
    include: { food: { include: { servings: true } } },
  });
  if (!item) throw notFound("Meal item");
  return item;
}

export async function updateMealItem(
  userId: string,
  itemId: string,
  input: { quantity: number; unit: ServingUnit; notes?: string },
) {
  const item = await getOwnedItem(userId, itemId);
  // Quick-add items carry their macros directly; scale them instead of recalculating from 0/100g.
  if (item.food.name === QUICK_ADD_NAME && item.food.createdByUserId === userId) {
    const ratio = input.quantity / (item.quantity ?? 1);
    return prisma.mealItem.update({
      where: { id: itemId },
      data: {
        quantity: input.quantity,
        calories: item.calories * ratio,
        proteinG: item.proteinG * ratio,
        carbsG: item.carbsG * ratio,
        fatG: item.fatG * ratio,
        notes: input.notes ?? item.notes,
      },
    });
  }
  const grams = toGrams(item.food, input.quantity, input.unit);
  return prisma.mealItem.update({
    where: { id: itemId },
    data: {
      quantity: input.quantity,
      servingUnit: input.unit,
      quantityG: grams,
      ...nutritionFor(item.food, grams),
      notes: input.notes ?? item.notes,
    },
  });
}

export async function deleteMealItem(userId: string, itemId: string) {
  const item = await getOwnedItem(userId, itemId);
  await prisma.$transaction(async (tx) => {
    await tx.mealItem.delete({ where: { id: item.id } });
    const remaining = await tx.mealItem.count({ where: { mealId: item.mealId } });
    if (remaining === 0) await tx.meal.delete({ where: { id: item.mealId } });
  });
}

// ── Quick add (raw macros) ──────────────────────────────────────────

export const QUICK_ADD_NAME = "Quick Add";

async function quickAddFood(userId: string) {
  const existing = await prisma.food.findFirst({ where: { createdByUserId: userId, name: QUICK_ADD_NAME } });
  if (existing) return existing;
  return prisma.food.create({
    data: {
      name: QUICK_ADD_NAME,
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

export async function quickAdd(
  userId: string,
  input: { mealType: MealType; date: string; calories: number; proteinG: number; carbsG: number; fatG: number; label?: string },
) {
  const food = await quickAddFood(userId);
  return prisma.$transaction(async (tx) => {
    const meal = await ensureMeal(tx, userId, input.date, input.mealType);
    return tx.mealItem.create({
      data: {
        mealId: meal.id,
        foodId: food.id,
        quantity: 1,
        quantityG: 0,
        servingUnit: "serving",
        calories: input.calories,
        proteinG: input.proteinG,
        carbsG: input.carbsG,
        fatG: input.fatG,
        fiberG: 0,
        notes: input.label ?? null,
      },
    });
  });
}

// ── Custom foods ────────────────────────────────────────────────────

export interface CustomFoodInput {
  name: string;
  brand?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number | null;
  defaultServingSizeG?: number;
  defaultServingUnit?: ServingUnit;
}

export async function createCustomFood(userId: string, input: CustomFoodInput) {
  return prisma.food.create({
    data: {
      ...input,
      fiberPer100g: input.fiberPer100g ?? null,
      brand: input.brand ?? null,
      defaultServingSizeG: input.defaultServingSizeG ?? 100,
      defaultServingUnit: input.defaultServingUnit ?? "g",
      category: "OTHER",
      isPublic: false,
      isVerified: false,
      createdByUserId: userId,
    },
  });
}

// ── Saved meals ─────────────────────────────────────────────────────

export async function listSavedMeals(userId: string) {
  return prisma.savedMeal.findMany({
    where: { userId },
    include: { items: { include: { food: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSavedMeal(
  userId: string,
  input: { name: string; description?: string; items: { foodId: string; quantity: number; unit: ServingUnit }[] },
) {
  // Every food must be visible to this user.
  const ids = [...new Set(input.items.map((i) => i.foodId))];
  const foods = await prisma.food.findMany({ where: { id: { in: ids }, ...visibleTo(userId) }, include: { servings: true } });
  if (foods.length !== ids.length) throw notFound("Food");
  const byId = new Map(foods.map((f) => [f.id, f]));

  return prisma.savedMeal.create({
    data: {
      userId,
      name: input.name,
      description: input.description ?? null,
      items: {
        create: input.items.map((i) => ({
          foodId: i.foodId,
          quantity: i.quantity,
          servingUnit: i.unit,
          quantityG: toGrams(byId.get(i.foodId)!, i.quantity, i.unit),
        })),
      },
    },
    include: { items: true },
  });
}

/** Save the current contents of one of the user's logged meals as a template. */
export async function saveMealFromLog(userId: string, input: { name: string; date: string; mealType: MealType }) {
  const meal = await prisma.meal.findUnique({
    where: { userId_date_mealType: { userId, date: toDbDate(input.date), mealType: input.mealType } },
    include: { items: { include: { food: { select: { name: true, createdByUserId: true } } } } },
  });
  const items = (meal?.items ?? []).filter((i) => i.food.name !== QUICK_ADD_NAME);
  if (items.length === 0) throw notFound("Logged foods for that meal");
  return prisma.savedMeal.create({
    data: {
      userId,
      name: input.name,
      items: {
        create: items.map((i) => ({
          foodId: i.foodId,
          quantity: i.quantity ?? i.quantityG,
          servingUnit: i.quantity ? i.servingUnit : "g",
          quantityG: i.quantityG,
        })),
      },
    },
  });
}

export async function deleteSavedMeal(userId: string, id: string) {
  const { count } = await prisma.savedMeal.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound("Saved meal");
}

export async function logSavedMeal(userId: string, savedMealId: string, input: { date: string; mealType: MealType }) {
  const saved = await prisma.savedMeal.findFirst({
    where: { id: savedMealId, userId },
    include: { items: { include: { food: true } } },
  });
  if (!saved) throw notFound("Saved meal");

  return prisma.$transaction(async (tx) => {
    const meal = await ensureMeal(tx, userId, input.date, input.mealType);
    await tx.mealItem.createMany({
      data: saved.items.map((i) => ({
        mealId: meal.id,
        foodId: i.foodId,
        quantity: i.quantity ?? i.quantityG,
        servingUnit: i.quantity ? i.servingUnit : "g",
        quantityG: i.quantityG,
        ...nutritionFor(i.food, i.quantityG),
      })),
    });
    return { count: saved.items.length };
  });
}
