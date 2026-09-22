import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { updateWorkoutStatus, startWorkout, completeWorkout } from "@/lib/services/workout-service";
import { z } from "zod";

const updateSchema = z.object({
  action: z.enum(["START", "COMPLETE", "SKIP", "RESCHEDULE"]),
  reason: z.string().optional(),
  newDate: z.string().optional(),
  durationMinutes: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequiredUser();
    const { id } = await params;
    const body = await req.json();
    
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error }, { status: 400 });
    }

    const { action, reason, newDate, durationMinutes } = parsed.data;

    if (action === "START") {
      const session = await startWorkout(id, user.id);
      return NextResponse.json({ session });
    }
    
    if (action === "COMPLETE") {
      const session = await completeWorkout(id, user.id, durationMinutes);
      return NextResponse.json({ session });
    }
    
    if (action === "SKIP" || action === "RESCHEDULE") {
      const session = await updateWorkoutStatus(id, user.id, action, { 
        reason, 
        newDate: newDate ? new Date(newDate) : undefined 
      });
      return NextResponse.json({ session });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Session update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
