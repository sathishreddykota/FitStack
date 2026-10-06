import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { quickAddMacros } from "@/services/nutrition.service";
import type { MealType } from "@/types/nutrition.types";

export async function POST(req: NextRequest) {
  try {
    const userId = await getInternalUserId();
    const body = await req.json();

    const { mealType, date, calories, proteinG, carbsG, fatG } = body;

    if (!mealType || !date || calories === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const [y, m, d] = date.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(y, m - 1, d));

    const { item } = await quickAddMacros({
      userId,
      mealType: mealType as MealType,
      date: parsedDate,
      calories: Number(calories),
      proteinG: Number(proteinG || 0),
      carbsG: Number(carbsG || 0),
      fatG: Number(fatG || 0),
    });

    return NextResponse.json({
      success: true,
      data: { itemId: item.id },
      message: "Quick add successful.",
    });
  } catch (error) {
    console.error("[POST /api/nutrition/meals/quick-add]", error);
    const msg = error instanceof Error ? error.message : "Failed to quick add macros.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
