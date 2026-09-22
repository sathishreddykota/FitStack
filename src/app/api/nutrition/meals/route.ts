import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import {
  getDayMeals,
  addFoodToMeal,
  calcDailyTotals,
} from "@/services/nutrition.service";
import type { ApiResponse } from "@/types/api.types";
import type { MealType, ServingUnit } from "@/types/nutrition.types";

// ─────────────────────────────────────────────
// GET /api/nutrition/meals?date=YYYY-MM-DD
// Returns all meals + items for a given day.
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const userId = await getInternalUserId();

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    let date: Date;
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      date = new Date(Date.UTC(y, m - 1, d));
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { success: false, error: "Invalid date format. Use YYYY-MM-DD." },
          { status: 400 },
        );
      }
    } else {
      const now = new Date();
      date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    }

    const meals = await getDayMeals(userId, date);
    const totals = calcDailyTotals(meals);

    return NextResponse.json({
      success: true,
      data: { meals, totals },
    });
  } catch (error) {
    console.error("[GET /api/nutrition/meals]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch meals." },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────
// POST /api/nutrition/meals
// Add a food item to a meal.
// ─────────────────────────────────────────────

interface AddFoodBody {
  foodId: string;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  quantityG: number;
  servingUnit: ServingUnit;
  notes?: string;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<{ itemId: string }>>> {
  try {
    const userId = await getInternalUserId();
    const body = (await req.json()) as AddFoodBody;

    // Validate required fields
    if (!body.foodId || !body.mealType || !body.date || !body.quantityG) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (body.quantityG < 1 || body.quantityG > 5000) {
      return NextResponse.json(
        { success: false, error: "Quantity must be between 1g and 5000g." },
        { status: 400 },
      );
    }

    const [y, m, d] = body.date.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));

    const { item } = await addFoodToMeal({
      userId,
      foodId: body.foodId,
      mealType: body.mealType,
      date,
      quantityG: body.quantityG,
      servingUnit: body.servingUnit ?? "g",
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      data: { itemId: item.id },
      message: "Food added to meal.",
    });
  } catch (error) {
    console.error("[POST /api/nutrition/meals]", error);
    const msg = error instanceof Error ? error.message : "Failed to add food.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
