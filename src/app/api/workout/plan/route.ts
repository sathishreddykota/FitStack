import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { generateTrainingPlan, WorkoutPlanInputs } from "@/lib/services/workout-service";
import { z } from "zod";

const planSchema = z.object({
  fitnessGoal: z.string(),
  trainingStyle: z.string(),
  trainingExperience: z.string(),
  daysPerWeek: z.number().min(2).max(7),
});

export async function POST(req: Request) {
  try {
    const user = await getRequiredUser();
    const body = await req.json();
    
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error }, { status: 400 });
    }

    const plan = await generateTrainingPlan(user.id, parsed.data as WorkoutPlanInputs);

    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error: any) {
    console.error("Plan generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
