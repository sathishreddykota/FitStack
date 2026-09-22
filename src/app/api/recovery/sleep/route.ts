import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userId = await getInternalUserId();
    const { dateStr, durationMinutes, quality } = await req.json();

    if (!dateStr || !durationMinutes) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Parse the date string as UTC midnight to align with @db.Date mapping
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const sleepLog = await prisma.sleepLog.upsert({
      where: {
        userId_date: {
          userId,
          date: targetDate,
        },
      },
      update: {
        durationMinutes,
        quality,
      },
      create: {
        userId,
        date: targetDate,
        durationMinutes,
        quality,
      },
    });

    return NextResponse.json({ success: true, data: sleepLog });
  } catch (error) {
    console.error("[POST /api/recovery/sleep]", error);
    return NextResponse.json({ success: false, error: "Failed to log sleep" }, { status: 500 });
  }
}
