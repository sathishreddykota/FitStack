import type { Metadata } from "next";
import { StartGoogle } from "./start-google";

export const metadata: Metadata = { title: "Signing in", robots: { index: false } };

// Opened by the Android app in a browser tab: /native-auth/start?id=<hand-off id>
export default async function NativeAuthStart({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <StartGoogle id={typeof id === "string" && /^[a-z0-9]{10,64}$/.test(id) ? id : null} />;
}
