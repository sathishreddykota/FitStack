import type { Metadata } from "next";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { NativeAuthShell } from "../shell";

export const metadata: Metadata = { title: "Signing in", robots: { index: false } };

// Google sends the browser tab back here; Clerk finishes sign-in (or sign-up for a new user).
export default async function NativeAuthCallback({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const done = `/native-auth/done?id=${encodeURIComponent(typeof id === "string" ? id : "")}`;
  return (
    <>
      <NativeAuthShell title="Signing you in…" body="Just a moment." spinner />
      <AuthenticateWithRedirectCallback signInForceRedirectUrl={done} signUpForceRedirectUrl={done} />
    </>
  );
}
