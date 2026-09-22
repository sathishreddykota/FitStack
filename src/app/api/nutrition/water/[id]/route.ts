import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getInternalUserId();
    const { id } = await params;

    // Verify ownership
    const waterLog = await prisma.waterLog.findUnique({
      where: { id },
    });

    if (!waterLog) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (waterLog.userId !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    await prisma.waterLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/nutrition/water/[id]]", error);
    return NextResponse.json({ success: false, error: "Failed to delete water log" }, { status: 500 });
  }
}
