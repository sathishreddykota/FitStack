import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userId = await getInternalUserId();
    const { dateStr, mood, energyLevel, sorenessLevel } = await req.json();

    if (!dateStr) {
      return NextResponse.json({ success: false, error: "Missing dateStr" }, { status: 400 });
    }

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const habitLog = await prisma.habitLog.upsert({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
      update: {
        mood,
        energyLevel,
        sorenessLevel,
      },
      create: {
        userId,
        date: targetDate,
        mood,
        energyLevel,
        sorenessLevel,
      },
    });

    return NextResponse.json({ success: true, data: habitLog });
  } catch (error) {
    console.error("[POST /api/recovery/habits]", error);
    return NextResponse.json({ success: false, error: "Failed to log habits" }, { status: 500 });
  }
}
