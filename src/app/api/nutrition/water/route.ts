import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userId = await getInternalUserId();
    const { amountMl, date } = await req.json();

    if (!amountMl || typeof amountMl !== "number") {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
    }

    let logDate = new Date();
    if (date) {
      logDate = new Date(date);
    }

    const waterLog = await prisma.waterLog.create({
      data: {
        userId,
        amountMl,
        date: logDate,
      },
    });

    return NextResponse.json({ success: true, data: waterLog });
  } catch (error) {
    console.error("[POST /api/nutrition/water]", error);
    return NextResponse.json({ success: false, error: "Failed to log water" }, { status: 500 });
  }
}
