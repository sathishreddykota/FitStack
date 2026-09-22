import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const weightLogSchema = z.object({
  weightKg: z.number().min(20).max(300),
  date: z.string(), // ISO string date
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getRequiredUser();
    const body = await req.json();

    const parsed = weightLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error }, { status: 400 });
    }

    const { weightKg, date, notes } = parsed.data;

    // We store date at start of day in UTC to avoid timezone mismatches
    const logDate = new Date(date);
    logDate.setUTCHours(0, 0, 0, 0);

    const weightLog = await prisma.weightLog.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: logDate,
        },
      },
      update: {
        weightKg,
        notes,
      },
      create: {
        userId: user.id,
        date: logDate,
        weightKg,
        notes,
      },
    });

    // Update current weight in profile if this is today or the most recent
    // For simplicity, we just update it. A robust app might check if logDate is >= existing max date.
    await prisma.fitnessProfile.update({
      where: { userId: user.id },
      data: { currentWeightKg: weightKg },
    });

    return NextResponse.json({ success: true, weightLog }, { status: 201 });
  } catch (error: any) {
    console.error("Weight log error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
