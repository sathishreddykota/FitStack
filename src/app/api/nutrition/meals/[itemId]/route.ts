import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { updateMealItem, deleteMealItem } from "@/services/nutrition.service";
import type { ApiResponse } from "@/types/api.types";
import type { ServingUnit } from "@/types/nutrition.types";

// ─────────────────────────────────────────────
// PATCH /api/nutrition/meals/[itemId]
// Update a meal item's quantity / notes.
// ─────────────────────────────────────────────

interface UpdateBody {
  quantityG: number;
  servingUnit: ServingUnit;
  notes?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse<ApiResponse<{ updated: true }>>> {
  try {
    const userId = await getInternalUserId();
    const { itemId } = await params;
    const body = (await req.json()) as UpdateBody;

    if (!body.quantityG || body.quantityG < 1 || body.quantityG > 5000) {
      return NextResponse.json(
        { success: false, error: "Quantity must be between 1g and 5000g." },
        { status: 400 },
      );
    }

    await updateMealItem({
      itemId,
      userId,
      quantityG: body.quantityG,
      servingUnit: body.servingUnit ?? "g",
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error("[PATCH /api/nutrition/meals/:itemId]", error);
    const msg = error instanceof Error ? error.message : "Failed to update item.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 },
    );
  }
}

// ─────────────────────────────────────────────
// DELETE /api/nutrition/meals/[itemId]
// Remove a single food item from a meal.
// ─────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse<ApiResponse<{ deleted: true }>>> {
  try {
    const userId = await getInternalUserId();
    const { itemId } = await params;

    await deleteMealItem(itemId, userId);

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/nutrition/meals/:itemId]", error);
    const msg = error instanceof Error ? error.message : "Failed to delete item.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 },
    );
  }
}
