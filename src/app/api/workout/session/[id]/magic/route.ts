import { NextRequest, NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const WorkoutSchema = z.object({
  exercises: z.array(
    z.object({
      exerciseId: z.string().describe("The ID of the exercise from the provided list that best matches what the user did"),
      sets: z.array(
        z.object({
          weightKg: z.number().nullable().describe("The weight used in kg. If pounds are mentioned, convert to kg. If bodyweight, return null."),
          reps: z.number().nullable().describe("The number of repetitions completed."),
        })
      ).describe("The sets completed for this exercise"),
    })
  ).describe("The list of exercises and their sets parsed from the user's input"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getInternalUserId();
    const { id: sessionId } = await params;
    const body = await req.json();
    const { transcript } = body;

    if (!transcript) {
      return NextResponse.json({ success: false, error: "Missing transcript" }, { status: 400 });
    }

    // Verify session ownership
    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId, userId },
      include: { exercises: true } // Need this to determine max orderIndex
    });
    
    if (!session) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    // Get available exercises to provide to the AI
    const availableExercises = await prisma.exercise.findMany({
      select: { id: true, name: true, category: true }
    });

    const exerciseListStr = availableExercises.map(e => `[ID: ${e.id}] ${e.name} (${e.category})`).join("\n");

    const prompt = `
      You are an expert fitness AI. A user is speaking into their app to log a workout.
      Extract the structured data from their natural language input.

      Here is the list of available exercises in the database:
      ${exerciseListStr}

      Instructions:
      - Match the user's spoken exercise to the closest exercise in the list and return its ID.
      - If they specify pounds (lbs), convert it to kg (1 lb = 0.453592 kg).
      - If they say "bodyweight", "BW", or don't specify a weight for an exercise that is typically bodyweight (like pull-ups or push-ups), set weightKg to null.
      - If they give a rep range like "10 to 12 reps", just pick the lower bound (10).
      
      User Input: "${transcript}"
    `;

    const { object } = await generateObject({
      model: google("gemini-flash-lite-latest"),
      schema: WorkoutSchema,
      prompt,
    });

    // We now have the structured object.
    if (!object.exercises || object.exercises.length === 0) {
      return NextResponse.json({ success: false, error: "Could not parse any exercises from input." }, { status: 400 });
    }

    // Calculate starting orderIndex
    let nextOrderIndex = session.exercises.length > 0 
      ? Math.max(...session.exercises.map(e => e.orderIndex)) + 1 
      : 0;

    // Create the SessionExercises and WorkoutSets
    const createdData = [];

    for (const parsedEx of object.exercises) {
      // Create session exercise
      const sessionExercise = await prisma.sessionExercise.create({
        data: {
          sessionId,
          exerciseId: parsedEx.exerciseId,
          orderIndex: nextOrderIndex++,
          targetSets: parsedEx.sets.length,
        }
      });

      // Create sets
      let setNumber = 1;
      const createdSets = [];
      for (const parsedSet of parsedEx.sets) {
        const set = await prisma.workoutSet.create({
          data: {
            sessionExerciseId: sessionExercise.id,
            setNumber,
            weightKg: parsedSet.weightKg,
            reps: parsedSet.reps,
            completedAt: new Date(), // They are logging it after the fact, so we can mark it complete
          }
        });
        createdSets.push(set);
        setNumber++;
      }
      
      createdData.push({
        sessionExercise,
        sets: createdSets
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: createdData 
    });

  } catch (error: any) {
    console.error("Magic log error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
