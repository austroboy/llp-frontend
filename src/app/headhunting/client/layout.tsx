"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";

/**
 * Headhunting Client section.
 *
 * All pages under /headhunting/client/* require an authenticated session,
 * EXCEPT /headhunting/client/hire/new — that page hosts the in-flow
 * organization-account creation step (issue 6 in the 2026-04-07 client
 * report) so guests can sign up without leaving the form. The page itself
 * still gates submission to organization users via `requireOrgUser` in
 * the Convex mutations (server-side backstop).
 *
 * This layout is client-side because it needs `usePathname()` to make the
 * per-page exception. The previous server-side `currentUser()` redirect
 * couldn't see the request path reliably.
 */
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const allowGuest = pathname?.startsWith("/headhunting/client/hire/new") ?? false;

  useEffect(() => {
    if (!isLoaded) return;
    if (user) return;
    if (allowGuest) return;
    const next = pathname ? `?redirect_url=${encodeURIComponent(pathname)}` : "";
    router.replace(`/sign-in${next}`);
  }, [isLoaded, user, allowGuest, pathname, router]);

  // Avoid a flash of the page before the auth state resolves.
  if (!isLoaded) return null;
  if (!user && !allowGuest) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />
      {children}
      <HomepageFooter />
    </div>
  );
}
