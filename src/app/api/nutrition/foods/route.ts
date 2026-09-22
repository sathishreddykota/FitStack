import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { searchFoods } from "@/services/nutrition.service";
import type { ApiResponse } from "@/types/api.types";

// ─────────────────────────────────────────────
// GET /api/nutrition/foods?q=&limit=&category=
// ─────────────────────────────────────────────

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<Awaited<ReturnType<typeof searchFoods>>>>> {
  try {
    const userId = await getInternalUserId();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") ?? "";
    const category = searchParams.get("category") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

    if (query.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    const foods = await searchFoods({ query, category, limit, userId });

    return NextResponse.json({ success: true, data: foods });
  } catch (error) {
    console.error("[GET /api/nutrition/foods]", error);
    return NextResponse.json(
      { success: false, error: "Failed to search foods." },
      { status: 500 },
    );
  }
}
