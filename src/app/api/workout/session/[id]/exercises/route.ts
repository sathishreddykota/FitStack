import { ok, parseBody, route } from "@/server/http";
import { requireApiUser } from "@/server/auth";
import { addExercise } from "@/server/workout/service";
import { addExerciseSchema } from "@/server/workout/schemas";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/workout/session/:id/exercises — returns the new exercise with real set ids
export const POST = route<Ctx>("POST /api/workout/session/:id/exercises", async (req, { params }) => {
  const user = await requireApiUser();
  const { exerciseId, sets } = await parseBody(req, addExerciseSchema);
  return ok(await addExercise(user.id, (await params).id, exerciseId, sets), { status: 201 });
});
