import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { prefsFor } from "@/server/notifications/service";
import { pushConfigured } from "@/server/notifications/push";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Meal reminders, goal progress and achievements on your phone.",
};

export default async function NotificationsPage() {
  const user = await requireOnboardedUser();
  const [prefs, phones] = await Promise.all([prefsFor(user.id), prisma.pushDevice.count({ where: { userId: user.id } })]);
  return <NotificationsClient initial={prefs} phones={phones} serverReady={pushConfigured()} />;
}
