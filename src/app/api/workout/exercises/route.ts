import { z } from "zod";
import { ok, parseQuery, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";

// GET /api/workout/exercises?q=bench
export const GET = route("GET /api/workout/exercises", async (req) => {
  await requireApiUser();
  const { q } = parseQuery(req, z.object({ q: z.string().max(60).default("") }));
  const term = q.trim();
  const exercises = await prisma.exercise.findMany({
    where: { isPublic: true, ...(term ? { name: { contains: term, mode: "insensitive" as const } } : {}) },
    select: { id: true, name: true, primaryMuscles: true, equipment: true, category: true, isKeyLift: true },
    orderBy: [{ isKeyLift: "desc" }, { name: "asc" }],
    take: 40,
  });
  return ok(exercises);
});
