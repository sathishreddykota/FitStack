import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SessionClient } from "./session-client";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getRequiredUser();
  const { id } = await params;

  const session = await prisma.workoutSession.findUnique({
    where: { id, userId: user.id },
    include: {
      exercises: {
        include: {
          exercise: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!session) notFound();

  return <SessionClient session={session} userId={user.id} />;
}
