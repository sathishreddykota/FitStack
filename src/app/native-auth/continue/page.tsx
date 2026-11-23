import type { Metadata } from "next";
import { ContinueSignUp } from "./continue-sign-up";

export const metadata: Metadata = { title: "Finish signing up", robots: { index: false } };

// A new Google account sometimes needs one more detail before Clerk creates it.
// That step happens here (on our site) and then returns to the Daystrong app.
export default async function NativeAuthContinue({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <ContinueSignUp id={typeof id === "string" && /^[a-z0-9]{10,64}$/.test(id) ? id : null} />;
}
