import type { Metadata } from "next";
import { FinishGoogle } from "./finish-google";

export const metadata: Metadata = { title: "Signing in", robots: { index: false } };

// Google sends the browser tab back here; we finish sign-in (or sign-up) ourselves.
export default async function NativeAuthCallback({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <FinishGoogle id={typeof id === "string" && /^[a-z0-9]{10,64}$/.test(id) ? id : null} />;
}
