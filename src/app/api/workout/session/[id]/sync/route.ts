import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequiredUser();
    const { id } = await params;
    const body = await req.json(); // Array of SessionExercise with nested Sets

    // Verify ownership
    const session = await prisma.workoutSession.findUnique({
      where: { id, userId: user.id },
    });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const exercises = body.exercises; // Ensure this is passed correctly

    // Using a transaction to sync all sets
    await prisma.$transaction(async (tx) => {
      for (const ex of exercises) {
        // Upsert the session exercise in case they added one
        const sessionExercise = await tx.sessionExercise.upsert({
          where: { id: ex.id || "new-placeholder" }, // Prisma upsert needs unique ID. If new, use a dummy that fails where, so it creates
          update: {
            orderIndex: ex.orderIndex,
            notes: ex.notes,
          },
          create: {
            sessionId: id,
            exerciseId: ex.exerciseId,
            orderIndex: ex.orderIndex,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeightKg: ex.targetWeightKg,
          },
        });

        // Now upsert sets
        if (ex.sets) {
          for (const set of ex.sets) {
            await tx.workoutSet.upsert({
              where: { id: set.id || "new-placeholder" },
              update: {
                weightKg: set.weightKg,
                reps: set.reps,
                completedAt: set.completedAt ? new Date(set.completedAt) : null,
                isPersonalRecord: set.isPersonalRecord || false,
                setNumber: set.setNumber,
              },
              create: {
                sessionExerciseId: sessionExercise.id,
                setNumber: set.setNumber,
                weightKg: set.weightKg,
                reps: set.reps,
                completedAt: set.completedAt ? new Date(set.completedAt) : null,
                isPersonalRecord: set.isPersonalRecord || false,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Session sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
