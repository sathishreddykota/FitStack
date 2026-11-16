import type { Metadata } from "next";
import { requireOnboardedUser, todayOf } from "@/server/auth";
import { waterForDay, waterTrend } from "@/server/tracking";
import { targetsOf } from "@/server/coach/context";
import { WaterClient } from "./water-client";

export const metadata: Metadata = {
  title: "Water Tracking",
  description: "Log your daily water intake and hit your hydration targets.",
};

// Water tracking is part of the FREE plan.
export default async function WaterPage() {
  const user = await requireOnboardedUser();
  const today = todayOf(user).str;
  const targetMl = targetsOf(user).waterMl;
  const [day, trend] = await Promise.all([waterForDay(user.id, today), waterTrend(user.id, today, targetMl)]);
  return <WaterClient initialData={{ targetMl, totalMl: day.totalMl, logs: day.logs }} trendsData={trend} />;
}
