import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ─────────────────────────────────────────────
// Route Matchers
// ─────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  "/",                     // Marketing landing page
  "/sign-in(.*)",          // Clerk sign-in (catch-all)
  "/sign-up(.*)",          // Clerk sign-up (catch-all)
  "/forgot-password(.*)",  // Password reset
  "/api/webhook(.*)",      // Webhooks must be unprotected
]);

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const path = req.nextUrl.pathname;

  // Allow public routes through without authentication
  if (isPublicRoute(req)) {
    // If already authenticated user visits sign-in/sign-up, redirect to dashboard
    if (userId && (path.startsWith("/sign-in") || path.startsWith("/sign-up"))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // For protected routes: redirect to sign-in if not authenticated
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
