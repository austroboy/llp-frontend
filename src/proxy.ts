import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/pdf(.*)",
  "/landing(.*)",
  "/experts(.*)",
  "/api/experts(.*)",
  "/services(.*)",
  "/pricing(.*)",
  "/academy(.*)",
  "/blog(.*)",
  "/headhunting(.*)",
  "/search(.*)",
  "/shared(.*)",
  "/chat/print(.*)",
  "/profiles(.*)",
  // AI Search hidden pre-launch — admin only. Uncomment to re-enable guest access.
  // "/chat(.*)",
  // "/api/chat(.*)",
  "/resources(.*)",
  "/api/resources(.*)",
  "/api/cron(.*)",
  "/api/telegram(.*)",
  "/about(.*)",
  "/contact(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/track(.*)",
  "/og(.*)",
  "/research(.*)",
  "/audit(.*)",
  "/coming-soon(.*)",
]);

/**
 * Pre-launch coming-soon gate.
 *
 * Live routes:
 *   /                — home
 *   /services        — services desk
 *   /coming-soon     — the gate itself
 *   /admin/*         — admin panel (required for service data edits)
 *   /api/*           — API + cron + webhooks
 *   /sign-in, /sign-up — Clerk auth
 *
 * All other top-level routes are rewritten to /coming-soon.
 * To re-open routes: remove this gate (the `comingSoonAllowed` matcher
 * and the early rewrite branch) and ship.
 */
const comingSoonAllowed = createRouteMatcher([
  "/",
  "/services(.*)",
  "/admin(.*)",
  "/api(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/coming-soon(.*)",
  "/og(.*)",
  "/_next(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Coming-soon gate fires BEFORE Clerk auth so we don't ask users to
  // log in just to see the placeholder page.
  if (!comingSoonAllowed(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/coming-soon";
    return NextResponse.rewrite(url);
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
