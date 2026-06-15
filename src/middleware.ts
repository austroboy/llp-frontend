import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Coming-soon gate.
 *
 * Allowed live routes:
 *   - "/"               (home)
 *   - "/services"       (services + sub-paths)
 *   - "/coming-soon"    (the gate itself)
 *   - "/admin/*"        (admin panel — required for service data edits)
 *   - "/api/*"          (API + cron + webhooks)
 *   - "/sign-in", "/sign-up"  (Clerk auth)
 *   - static assets (_next, favicon, public files)
 *
 * Every other route is rewritten to "/coming-soon".
 * Production launch: delete this file to re-open all routes.
 */

const ALLOWED_PREFIXES = [
  "/services",
  "/admin",
  "/api",
  "/sign-in",
  "/sign-up",
  "/coming-soon",
  "/_next",
  "/favicon",
  "/apple-icon",
  "/og",
  "/robots.txt",
  "/sitemap.xml",
];

const STATIC_FILE_REGEX = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|otf|json|xml|txt)$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") return NextResponse.next();

  if (ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (STATIC_FILE_REGEX.test(pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
