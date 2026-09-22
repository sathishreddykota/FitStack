import { getRequiredUser } from "@/lib/auth";
import type { Metadata } from "next";
import { PlanGeneratorClient } from "./plan-client";

export const metadata: Metadata = { title: "New Training Plan" };

export default async function NewPlanPage() {
  const user = await getRequiredUser();
  return <PlanGeneratorClient userId={user.id} />;
}
