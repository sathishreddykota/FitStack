import { getRequiredUser } from "@/lib/auth";
import type { Metadata } from "next";
import { ProfileClient } from "./profile-client";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your physical metrics and fitness goals.",
};

export default async function ProfilePage() {
  const user = await getRequiredUser();
  
  const profile = await prisma.fitnessProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  return <ProfileClient initialProfile={profile} user={user} />;
}
