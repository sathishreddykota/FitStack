import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient, MealType } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await req.json();
    const { date, mealType } = body;

    if (!date || !mealType) {
      return NextResponse.json(
        { error: "date and mealType are required" },
        { status: 400 }
      );
    }

    // Parse date (assumes YYYY-MM-DD string)
    const logDate = new Date(date);
    if (isNaN(logDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Get the saved meal
    const savedMeal = await prisma.savedMeal.findUnique({
      where: { id, userId: user.id },
      include: {
        items: {
          include: { food: true },
        },
      },
    });

    if (!savedMeal) {
      return NextResponse.json({ error: "Saved meal not found" }, { status: 404 });
    }

    // Find or create the daily meal log
    let meal = await prisma.meal.findUnique({
      where: {
        userId_date_mealType: {
          userId: user.id,
          date: logDate,
          mealType: mealType as MealType,
        },
      },
    });

    if (!meal) {
      meal = await prisma.meal.create({
        data: {
          userId: user.id,
          date: logDate,
          mealType: mealType as MealType,
        },
      });
    }

    // Create a mealItem for each savedMealItem
    const mealItemsData = savedMeal.items.map((item) => {
      const quantityRatio = item.quantityG / 100;
      return {
        mealId: meal!.id,
        foodId: item.foodId,
        quantityG: item.quantityG,
        servingUnit: item.servingUnit,
        calories: item.food.caloriesPer100g * quantityRatio,
        proteinG: item.food.proteinPer100g * quantityRatio,
        carbsG: item.food.carbsPer100g * quantityRatio,
        fatG: item.food.fatPer100g * quantityRatio,
        fiberG: item.food.fiberPer100g ? item.food.fiberPer100g * quantityRatio : null,
      };
    });

    const createdItems = await prisma.$transaction(
      mealItemsData.map((data) =>
        prisma.mealItem.create({
          data,
          include: { food: true },
        })
      )
    );

    return NextResponse.json({ success: true, items: createdItems });
  } catch (error: any) {
    console.error("[POST_LOG_SAVED_MEAL]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
