import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { aiModel, quoteUserText, USER_TEXT_RULE } from "../ai";
import { HttpError, notFound } from "../http";

// ─────────────────────────────────────────────
// "Magic log" for workouts: "bench 3x8 at 60, then pull-ups 3x10" → sets.
// The model may only reference exercises from our library; anything else is
// dropped (the old version crashed on hallucinated ids).
// ─────────────────────────────────────────────

const Parsed = z.object({
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().describe("id of the matching exercise from the list"),
        sets: z
          .array(
            z.object({
              weightKg: z.number().min(0).max(500).nullable().describe("kg; convert lbs (×0.4536); null for bodyweight"),
              reps: z.number().int().min(0).max(200).nullable(),
            }),
          )
          .max(20),
      }),
    )
    .max(15),
});

export async function logWorkoutFromText(userId: string, sessionId: string, text: string) {
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: { exercises: { select: { orderIndex: true } } },
  });
  if (!session) throw notFound("Workout");

  const library = await prisma.exercise.findMany({ where: { isPublic: true }, select: { id: true, name: true } });
  const ids = new Set(library.map((e) => e.id));

  let parsed: z.infer<typeof Parsed>;
  try {
    const { output } = await generateText({
      model: aiModel(),
      output: Output.object({ schema: Parsed }),
      system: [
        "You turn a gym-goer's description of their workout into structured sets.",
        "Only use exercise ids from this list; skip anything that doesn't match:",
        library.map((e) => `${e.id}: ${e.name}`).join("\n"),
        "'3x8 at 60' means 3 sets of 8 reps at 60 kg. For a rep range use the lower number.",
        USER_TEXT_RULE,
      ].join("\n"),
      prompt: quoteUserText(text, 800),
    });
    parsed = output;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error("[ai-workout-parse]", err);
    throw new HttpError(502, "Couldn't understand that. Try e.g. 'bench press 3x8 at 60kg'.", "AI_UNAVAILABLE");
  }

  const valid = parsed.exercises.filter((e) => ids.has(e.exerciseId) && e.sets.length > 0);
  if (valid.length === 0) {
    throw new HttpError(422, "No known exercises found. Try naming them like 'squat' or 'lat pulldown'.", "VALIDATION");
  }

  let order = session.exercises.reduce((m, e) => Math.max(m, e.orderIndex), -1) + 1;
  const now = new Date();
  await prisma.$transaction([
    ...valid.map((e) =>
      prisma.sessionExercise.create({
        data: {
          sessionId: session.id,
          exerciseId: e.exerciseId,
          orderIndex: order++,
          targetSets: e.sets.length,
          sets: {
            create: e.sets.map((s, i) => ({ setNumber: i + 1, weightKg: s.weightKg, reps: s.reps, completedAt: now })),
          },
        },
      }),
    ),
    prisma.workoutSession.update({
      where: { id: session.id },
      data: { status: session.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS", startedAt: session.startedAt ?? now },
    }),
  ]);

  const names = new Map(library.map((e) => [e.id, e.name]));
  return {
    added: valid.map((e) => ({ name: names.get(e.exerciseId)!, sets: e.sets.length })),
    skipped: parsed.exercises.length - valid.length,
  };
}
