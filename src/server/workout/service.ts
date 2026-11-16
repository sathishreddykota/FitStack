import "server-only";
import type { Prisma, SetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError, notFound } from "../http";
import { addDays, diffDays, fromDbDate, startOfWeek, toDbDate } from "../dates";
import { buildPlan, type PlanInputs } from "./plan-builder";
import { estimate1RM, isNewPR } from "./strength";

// ─────────────────────────────────────────────
// Workouts: plans, calendar, and granular session logging.
// Ownership is enforced on every query through session.userId — ids sent by
// the client are never trusted on their own.
// ─────────────────────────────────────────────

export const CALENDAR_WEEKS = 4;

// ── Plans ───────────────────────────────────────────────────────────

export async function getActivePlan(userId: string) {
  return prisma.trainingPlan.findFirst({
    where: { userId, isActive: true },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
        include: { plannedExercises: { orderBy: { orderIndex: "asc" }, include: { exercise: { select: { id: true, name: true } } } } },
      },
    },
  });
}

export async function previewPlan(inputs: PlanInputs) {
  const library = await prisma.exercise.findMany({ where: { isPublic: true } });
  return buildPlan(inputs, library);
}

/** Create a plan, make it the active one, and schedule the next weeks. */
export async function generatePlan(userId: string, inputs: PlanInputs, today: string) {
  const built = await previewPlan(inputs);

  const plan = await prisma.$transaction(async (tx) => {
    // Retire old plans and their not-yet-started future sessions.
    const old = await tx.trainingPlan.findMany({ where: { userId, isActive: true }, select: { id: true } });
    if (old.length) {
      await tx.trainingPlan.updateMany({ where: { id: { in: old.map((p) => p.id) } }, data: { isActive: false } });
      await tx.workoutSession.deleteMany({
        where: {
          userId,
          trainingPlanId: { in: old.map((p) => p.id) },
          status: "PLANNED",
          date: { gte: toDbDate(today) },
          exercises: { none: { sets: { some: { completedAt: { not: null } } } } },
        },
      });
    }

    return tx.trainingPlan.create({
      data: {
        userId,
        name: built.name,
        description: built.description,
        durationWeeks: 8,
        daysPerWeek: built.days.length,
        trainingStyle: inputs.style,
        difficultyLevel: inputs.experience,
        isActive: true,
        days: {
          create: built.days.map((d) => ({
            dayNumber: d.dayNumber,
            dayName: d.dayName,
            dayType: d.dayType,
            name: d.name,
            plannedExercises: {
              create: d.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                orderIndex: e.orderIndex,
                targetSets: e.targetSets,
                targetReps: e.targetReps,
              })),
            },
          })),
        },
      },
    });
  });

  await scheduleWeeks(userId, plan.id, today, CALENDAR_WEEKS);
  return getActivePlan(userId);
}

/** Make sure the active plan has sessions scheduled for the next N weeks (idempotent). */
export async function scheduleWeeks(userId: string, planId: string, today: string, weeks: number) {
  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, userId },
    include: { days: { include: { plannedExercises: true } } },
  });
  if (!plan) throw notFound("Plan");

  const weekStart = startOfWeek(today);
  const until = addDays(weekStart, weeks * 7 - 1);
  const existing = await prisma.workoutSession.findMany({
    where: { userId, trainingPlanId: plan.id, OR: [{ date: { gte: toDbDate(today), lte: toDbDate(until) } }, { originalDate: { gte: toDbDate(today), lte: toDbDate(until) } }] },
    select: { originalDate: true, date: true, name: true },
  });
  const taken = new Set(existing.map((s) => `${fromDbDate(s.originalDate ?? s.date)}|${s.name}`));

  const creates: Prisma.WorkoutSessionCreateArgs["data"][] = [];
  for (let w = 0; w < weeks; w++) {
    for (const day of plan.days) {
      if (day.isRestDay) continue;
      const date = addDays(weekStart, w * 7 + day.dayNumber - 1);
      if (date < today || taken.has(`${date}|${day.name}`)) continue;
      creates.push({
        userId,
        trainingPlanId: plan.id,
        name: day.name,
        dayType: day.dayType,
        date: toDbDate(date),
        originalDate: toDbDate(date),
        status: "PLANNED",
        exercises: {
          create: day.plannedExercises.map((pe) => ({
            exerciseId: pe.exerciseId,
            orderIndex: pe.orderIndex,
            targetSets: pe.targetSets,
            targetReps: pe.targetReps,
            targetWeightKg: pe.targetWeightKg,
            notes: pe.notes,
          })),
        },
      });
    }
  }
  if (creates.length) await prisma.$transaction(creates.map((data) => prisma.workoutSession.create({ data })));
  return creates.length;
}

// ── Calendar ────────────────────────────────────────────────────────

export async function sessionsInRange(userId: string, from: string, to: string, today: string) {
  // Past sessions that were never started become MISSED.
  await prisma.workoutSession.updateMany({
    where: { userId, status: "PLANNED", date: { lt: toDbDate(today) } },
    data: { status: "MISSED" },
  });
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: { exercise: { select: { id: true, name: true } }, _count: { select: { sets: true } } },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return sessions.map((s) => ({ ...s, day: fromDbDate(s.date) }));
}

// ── Session lifecycle ───────────────────────────────────────────────

const sessionInclude = {
  exercises: {
    orderBy: { orderIndex: "asc" },
    include: {
      exercise: { select: { id: true, name: true, primaryMuscles: true, equipment: true, category: true } },
      sets: { orderBy: { setNumber: "asc" } },
    },
  },
} satisfies Prisma.WorkoutSessionInclude;

async function ownedSession(userId: string, sessionId: string) {
  const s = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!s) throw notFound("Workout");
  return s;
}

export async function getSession(userId: string, sessionId: string) {
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId }, include: sessionInclude });
  if (!session) throw notFound("Workout");
  const previous = await previousPerformance(
    userId,
    session.exercises.map((e) => e.exerciseId),
    session.id,
  );
  return { ...session, day: fromDbDate(session.date), previous };
}

export async function createSession(userId: string, input: { date: string; name?: string; start?: boolean }) {
  return prisma.workoutSession.create({
    data: {
      userId,
      name: input.name?.trim() || "Custom Workout",
      dayType: "CUSTOM",
      date: toDbDate(input.date),
      originalDate: toDbDate(input.date),
      status: input.start ? "IN_PROGRESS" : "PLANNED",
      startedAt: input.start ? new Date() : null,
    },
  });
}

export type SessionAction =
  | { action: "START" }
  | { action: "COMPLETE"; notes?: string }
  | { action: "SKIP"; reason?: string }
  | { action: "UNSKIP" }
  | { action: "RESCHEDULE"; newDate: string }
  | { action: "RENAME"; name: string };

export async function applySessionAction(userId: string, sessionId: string, input: SessionAction) {
  const s = await ownedSession(userId, sessionId);
  switch (input.action) {
    case "START":
      if (s.status === "COMPLETED") throw new HttpError(409, "This workout is already completed.", "CONFLICT");
      return prisma.workoutSession.update({
        where: { id: s.id },
        data: { status: "IN_PROGRESS", startedAt: s.startedAt ?? new Date(), skipReason: null },
      });
    case "COMPLETE": {
      const done = await prisma.workoutSet.count({
        where: { completedAt: { not: null }, sessionExercise: { sessionId: s.id } },
      });
      if (done === 0) throw new HttpError(422, "Complete at least one set before finishing.", "VALIDATION");
      const now = new Date();
      const started = s.startedAt ?? now;
      const minutes = Math.max(1, Math.min(300, Math.round((now.getTime() - started.getTime()) / 60000)));
      return prisma.workoutSession.update({
        where: { id: s.id },
        data: { status: "COMPLETED", completedAt: now, startedAt: started, durationMinutes: minutes, notes: input.notes ?? s.notes },
      });
    }
    case "SKIP":
      if (s.status === "COMPLETED") throw new HttpError(409, "A completed workout can't be skipped.", "CONFLICT");
      return prisma.workoutSession.update({ where: { id: s.id }, data: { status: "SKIPPED", skipReason: input.reason ?? null } });
    case "UNSKIP":
      return prisma.workoutSession.update({ where: { id: s.id }, data: { status: "PLANNED", skipReason: null } });
    case "RESCHEDULE":
      if (s.status === "COMPLETED") throw new HttpError(409, "A completed workout can't be moved.", "CONFLICT");
      if (Math.abs(diffDays(fromDbDate(s.date), input.newDate)) > 60) {
        throw new HttpError(400, "Pick a date within two months.", "VALIDATION");
      }
      return prisma.workoutSession.update({
        where: { id: s.id },
        data: { date: toDbDate(input.newDate), originalDate: s.originalDate ?? s.date, status: "PLANNED" },
      });
    case "RENAME":
      return prisma.workoutSession.update({ where: { id: s.id }, data: { name: input.name.trim() } });
  }
}

export async function deleteSession(userId: string, sessionId: string) {
  const s = await ownedSession(userId, sessionId);
  await prisma.workoutSession.delete({ where: { id: s.id } });
}

// ── Exercises & sets inside a session ───────────────────────────────

async function ownedSessionExercise(userId: string, sessionExerciseId: string) {
  const se = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, session: { userId } },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });
  if (!se) throw notFound("Exercise");
  return se;
}

async function ownedSet(userId: string, setId: string) {
  const set = await prisma.workoutSet.findFirst({
    where: { id: setId, sessionExercise: { session: { userId } } },
    include: { sessionExercise: { select: { id: true, exerciseId: true, sessionId: true } } },
  });
  if (!set) throw notFound("Set");
  return set;
}

/** Add an exercise; sets are pre-filled from the last time the user did it. */
export async function addExercise(userId: string, sessionId: string, exerciseId: string, sets = 3) {
  const session = await ownedSession(userId, sessionId);
  const exercise = await prisma.exercise.findFirst({ where: { id: exerciseId, isPublic: true } });
  if (!exercise) throw notFound("Exercise");

  const last = await prisma.sessionExercise.aggregate({ where: { sessionId: session.id }, _max: { orderIndex: true } });
  const prev = (await previousPerformance(userId, [exerciseId], session.id))[exerciseId] ?? [];

  const created = await prisma.sessionExercise.create({
    data: {
      sessionId: session.id,
      exerciseId,
      orderIndex: (last._max.orderIndex ?? -1) + 1,
      targetSets: sets,
      sets: {
        create: Array.from({ length: sets }, (_, i) => ({
          setNumber: i + 1,
          weightKg: prev[i]?.weightKg ?? prev[prev.length - 1]?.weightKg ?? null,
          reps: prev[i]?.reps ?? prev[prev.length - 1]?.reps ?? null,
        })),
      },
    },
    include: sessionInclude.exercises.include,
  });
  if (session.status === "PLANNED") {
    await prisma.workoutSession.update({ where: { id: session.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
  }
  return created;
}

export async function removeExercise(userId: string, sessionExerciseId: string) {
  const se = await ownedSessionExercise(userId, sessionExerciseId);
  await prisma.sessionExercise.delete({ where: { id: se.id } });
}

export async function addSet(userId: string, sessionExerciseId: string) {
  const se = await ownedSessionExercise(userId, sessionExerciseId);
  const lastSet = se.sets[se.sets.length - 1];
  return prisma.workoutSet.create({
    data: {
      sessionExerciseId: se.id,
      setNumber: (lastSet?.setNumber ?? 0) + 1,
      weightKg: lastSet?.weightKg ?? null,
      reps: lastSet?.reps ?? null,
    },
  });
}

export interface SetPatch {
  weightKg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  setType?: SetType;
  durationSeconds?: number | null;
  distanceM?: number | null;
  completed?: boolean;
}

/** Update a set. Completing it checks for a personal record. */
export async function updateSet(userId: string, setId: string, patch: SetPatch) {
  const set = await ownedSet(userId, setId);
  const { completed, ...fields } = patch;
  const next = { ...set, ...fields };

  let isPersonalRecord = set.isPersonalRecord;
  let completedAt = set.completedAt;
  if (completed === true && !set.completedAt) {
    completedAt = new Date();
    const best = await best1RM(userId, set.sessionExercise.exerciseId, set.id);
    isPersonalRecord = next.setType !== "WARMUP" && isNewPR(next, best);
  } else if (completed === false) {
    completedAt = null;
    isPersonalRecord = false;
  } else if (set.completedAt && (fields.weightKg !== undefined || fields.reps !== undefined)) {
    // Editing an already-completed set: re-evaluate the PR flag.
    const best = await best1RM(userId, set.sessionExercise.exerciseId, set.id);
    isPersonalRecord = next.setType !== "WARMUP" && isNewPR(next, best);
  }

  const updated = await prisma.workoutSet.update({
    where: { id: set.id },
    data: { ...fields, completedAt, isPersonalRecord },
  });

  // First completed set starts the session clock.
  if (completedAt) {
    await prisma.workoutSession.updateMany({
      where: { id: set.sessionExercise.sessionId, status: { in: ["PLANNED", "MISSED", "SKIPPED"] } },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  }
  return updated;
}

export async function deleteSet(userId: string, setId: string) {
  const set = await ownedSet(userId, setId);
  await prisma.$transaction(async (tx) => {
    await tx.workoutSet.delete({ where: { id: set.id } });
    const rest = await tx.workoutSet.findMany({
      where: { sessionExerciseId: set.sessionExercise.id },
      orderBy: { setNumber: "asc" },
    });
    for (const [i, s] of rest.entries()) {
      if (s.setNumber !== i + 1) await tx.workoutSet.update({ where: { id: s.id }, data: { setNumber: i + 1 } });
    }
  });
}

// ── History helpers ─────────────────────────────────────────────────

/** Best estimated 1RM across all of the user's completed sets for an exercise. */
async function best1RM(userId: string, exerciseId: string, excludeSetId?: string) {
  const sets = await prisma.workoutSet.findMany({
    where: {
      id: excludeSetId ? { not: excludeSetId } : undefined,
      completedAt: { not: null },
      setType: { not: "WARMUP" },
      weightKg: { not: null },
      reps: { not: null },
      sessionExercise: { exerciseId, session: { userId } },
    },
    select: { weightKg: true, reps: true },
  });
  return sets.reduce((m, s) => Math.max(m, estimate1RM(s.weightKg!, s.reps!)), 0);
}

/** Sets from the most recent other session where the user did each exercise. */
export async function previousPerformance(userId: string, exerciseIds: string[], excludeSessionId?: string) {
  const out: Record<string, { weightKg: number | null; reps: number | null }[]> = {};
  if (exerciseIds.length === 0) return out;
  const rows = await prisma.sessionExercise.findMany({
    where: {
      exerciseId: { in: [...new Set(exerciseIds)] },
      session: { userId, id: excludeSessionId ? { not: excludeSessionId } : undefined },
      sets: { some: { completedAt: { not: null } } },
    },
    orderBy: { session: { date: "desc" } },
    include: { sets: { where: { completedAt: { not: null } }, orderBy: { setNumber: "asc" } } },
    take: 50,
  });
  for (const r of rows) {
    if (!out[r.exerciseId]) out[r.exerciseId] = r.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps }));
  }
  return out;
}
