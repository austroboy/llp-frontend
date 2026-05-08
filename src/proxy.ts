import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
]);

export default clerkMiddleware(async (auth, request) => {
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
