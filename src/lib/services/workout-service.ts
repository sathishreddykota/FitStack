import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { addDays, startOfWeek, subDays, startOfDay, endOfDay, isSameDay } from "date-fns";

export type WorkoutPlanInputs = {
  fitnessGoal: string;
  trainingStyle: string;
  trainingExperience: string;
  daysPerWeek: number;
};

// ─────────────────────────────────────────────────────────────────
// 1. GENERATE TRAINING PLAN (TEMPLATES)
// ─────────────────────────────────────────────────────────────────

export async function generateTrainingPlan(userId: string, inputs: WorkoutPlanInputs) {
  const { daysPerWeek, trainingStyle, trainingExperience } = inputs;
  
  // Logic to pick a structure based on daysPerWeek
  // We will build a basic template and let the user modify it.
  
  const plan = await prisma.trainingPlan.create({
    data: {
      userId,
      name: `${daysPerWeek}-Day ${trainingStyle} Plan`,
      description: `Auto-generated plan based on your preferences.`,
      durationWeeks: 12,
      daysPerWeek,
      trainingStyle: trainingStyle as any,
      difficultyLevel: trainingExperience as any,
      isActive: true,
    },
  });

  // Assign workout days based on frequency
  // Simple heuristic for now, robust enough for MVP.
  let dayTypes = [];
  if (daysPerWeek === 3) dayTypes = ["FULL_BODY", "FULL_BODY", "FULL_BODY"];
  else if (daysPerWeek === 4) dayTypes = ["UPPER_STRENGTH", "LOWER_STRENGTH", "UPPER_HYPERTROPHY", "LOWER_HYPERTROPHY"];
  else if (daysPerWeek === 5) dayTypes = ["UPPER_STRENGTH", "LOWER_STRENGTH", "PUSH", "PULL", "LEGS"];
  else dayTypes = Array(daysPerWeek).fill("CUSTOM");

  const baseDayNumbers = [1, 2, 4, 5, 6, 7, 3];
  const dayNumbers = baseDayNumbers.slice(0, daysPerWeek).sort();

  for (let i = 0; i < dayTypes.length; i++) {
    await prisma.workoutDay.create({
      data: {
        planId: plan.id,
        dayNumber: dayNumbers[i] || i + 1,
        dayName: `Day ${i + 1}`,
        dayType: dayTypes[i] as any,
        name: dayTypes[i].replace("_", " "),
        isRestDay: false,
      },
    });
  }

  // Populate calendar for 4 weeks ahead
  await populateCalendar(userId, plan.id, 4);

  return plan;
}

// ─────────────────────────────────────────────────────────────────
// 2. POPULATE CALENDAR
// ─────────────────────────────────────────────────────────────────

export async function populateCalendar(userId: string, planId: string, weeksAhead: number = 4) {
  // Finds the active plan and populates WorkoutSessions into the future
  const plan = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: { days: { include: { plannedExercises: true } } },
  });

  if (!plan) throw new Error("Plan not found");

  const today = startOfDay(new Date());
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  // Generate sessions
  for (let week = 0; week < weeksAhead; week++) {
    for (const day of plan.days) {
      if (day.isRestDay) continue;

      const targetDate = addDays(currentWeekStart, (week * 7) + (day.dayNumber - 1));
      
      // Skip if date is in the past
      if (targetDate < today) continue;

      // Check if session already exists for this exact plan day on this date
      const existing = await prisma.workoutSession.findFirst({
        where: {
          userId,
          trainingPlanId: plan.id,
          date: targetDate,
          name: day.name,
        }
      });

      if (!existing) {
        // Create session
        const session = await prisma.workoutSession.create({
          data: {
            userId,
            trainingPlanId: plan.id,
            name: day.name,
            dayType: day.dayType,
            date: targetDate,
            status: "PLANNED",
            originalDate: targetDate,
          }
        });

        // Add exercises
        if (day.plannedExercises.length > 0) {
          for (const pe of day.plannedExercises) {
            await prisma.sessionExercise.create({
              data: {
                sessionId: session.id,
                exerciseId: pe.exerciseId,
                orderIndex: pe.orderIndex,
                targetSets: pe.targetSets,
                targetReps: pe.targetReps,
                targetWeightKg: pe.targetWeightKg,
                notes: pe.notes,
              }
            });
          }
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. WORKOUT LIFECYCLE (START, SKIP, RESCHEDULE, COMPLETE)
// ─────────────────────────────────────────────────────────────────

export async function getCalendarSessions(userId: string, startDate: Date, endDate: Date) {
  return prisma.workoutSession.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate }
    },
    include: {
      exercises: { include: { exercise: true } }
    },
    orderBy: { date: "asc" }
  });
}

export async function updateWorkoutStatus(
  sessionId: string, 
  userId: string, 
  action: "SKIP" | "RESCHEDULE", 
  options?: { reason?: string; newDate?: Date }
) {
  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Session not found");

  if (action === "SKIP") {
    return prisma.workoutSession.update({
      where: { id: sessionId },
      data: { status: "SKIPPED", skipReason: options?.reason }
    });
  }

  if (action === "RESCHEDULE" && options?.newDate) {
    const newDate = startOfDay(options.newDate);
    // Keep originalDate intact if it exists, else set it to current date
    const originalDate = session.originalDate || session.date;
    
    return prisma.workoutSession.update({
      where: { id: sessionId },
      data: { 
        date: newDate,
        originalDate,
      }
    });
  }
}

export async function startWorkout(sessionId: string, userId: string) {
  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId, userId } });
  if (!session) throw new Error("Session not found");

  if (session.status === "COMPLETED") throw new Error("Workout already completed");

  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: { 
      status: "IN_PROGRESS",
      startedAt: session.startedAt || new Date(),
    }
  });
}

export async function completeWorkout(sessionId: string, userId: string, durationMinutes?: number) {
  const session = await prisma.workoutSession.findUnique({ 
    where: { id: sessionId, userId },
    include: { exercises: { include: { sets: true } } }
  });
  if (!session) throw new Error("Session not found");

  // Validate that there is at least one completed set
  let hasCompletedSet = false;
  for (const ex of session.exercises) {
    if (ex.sets.some(s => s.completedAt !== null)) {
      hasCompletedSet = true;
      break;
    }
  }

  if (!hasCompletedSet) throw new Error("Cannot complete an empty workout");

  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: { 
      status: "COMPLETED",
      completedAt: new Date(),
      durationMinutes: durationMinutes || session.durationMinutes,
    }
  });
}
