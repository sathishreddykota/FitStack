import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function POST(req: Request) {
  try {
    const user = await getRequiredUser();
    const today = startOfDay(new Date());

    // Create a new ad-hoc session
    const session = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        name: "Custom Workout",
        dayType: "CUSTOM",
        date: today,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        originalDate: today,
      }
    });

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("Failed to create custom session:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
