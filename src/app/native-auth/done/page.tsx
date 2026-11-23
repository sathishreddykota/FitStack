import type { Metadata } from "next";
import { NativeAuthShell } from "../shell";
import { DoneClient } from "./done-client";

export const metadata: Metadata = { title: "Signed in", robots: { index: false } };

// Google sign-in finished in the browser tab. The page (not the server render) checks
// the session: right after the Google redirect, the browser knows it a moment before
// the server does.
export default async function NativeAuthDone({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (typeof id !== "string" || !/^[a-z0-9]{10,64}$/.test(id)) {
    return <NativeAuthShell title="This sign-in link isn't valid" body="Go back to the Daystrong app and tap “Continue with Google” again." />;
  }
  return <DoneClient id={id} />;
}
