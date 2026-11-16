import { notFound } from "next/navigation";
import { entitlementOf, requireOnboardedUser } from "@/server/auth";
import { HttpError } from "@/server/http";
import { getSession } from "@/server/workout/service";
import { SessionClient, type SessionData } from "./session-client";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOnboardedUser();
  const { id } = await params;

  let session;
  try {
    session = await getSession(user.id, id);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  }

  // Serialize dates for the client.
  const data: SessionData = JSON.parse(JSON.stringify(session));
  return <SessionClient initial={data} isPro={entitlementOf(user).isPro} />;
}
