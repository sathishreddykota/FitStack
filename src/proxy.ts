import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ─────────────────────────────────────────────
// Route protection (Next 16 "proxy", formerly middleware)
// ─────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  "/", // marketing landing page
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Legal pages must be reachable without an account (Razorpay / Play Store review)
  "/privacy",
  "/terms",
  "/refund",
  "/contact",
  // PWA assets
  "/manifest.webmanifest",
  "/sw.js",
  "/offline",
  // Webhooks authenticate with their own signatures
  "/api/webhooks(.*)",
  // The notification scheduler authenticates with CRON_SECRET
  "/api/cron(.*)",
  // Sign-out on a phone: no session left; the device token is the proof
  "/api/push/unregister",
  // Google sign-in for the Android app: runs before there's a session
  "/native-auth(.*)",
  "/api/native-auth/begin",
  "/api/native-auth/claim",
  "/api/native-auth/log",
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);
const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (isPublicRoute(req)) {
    if (userId && isAuthPage(req)) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (!userId) {
    // APIs answer with JSON so web and native clients can handle it.
    if (isApiRoute(req)) {
      return NextResponse.json({ success: false, error: "Please sign in.", code: "UNAUTHENTICATED" }, { status: 401 });
    }
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|m?js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
