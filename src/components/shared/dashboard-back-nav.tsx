"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

interface DashboardBackNavProps {
  /** Optional custom back label */
  backLabel?: string;
  /** Optional custom back href (instead of router.back()) */
  backHref?: string;
}

export function DashboardBackNav({ backLabel, backHref }: DashboardBackNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine if we're in org context
  const isOrg = pathname.startsWith("/org");
  const homeHref = isOrg ? "/org" : "/dashboard";
  const homeLabel = isOrg ? "Organization Dashboard" : "Dashboard";

  // Don't render on the main dashboard/org landing pages
  if (pathname === "/dashboard" || pathname === "/org") return null;

  // Hide dashboard home link when back already points to the dashboard root
  const showHomeLink = backHref !== homeHref;

  return (
    <div className="flex items-center gap-3 mb-4 text-sm">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel || "Back"}
        </Link>
      ) : (
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel || "Back"}
        </button>
      )}
      {showHomeLink && (
        <>
          <span className="text-muted-foreground/40">|</span>
          <Link
            href={homeHref}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="size-3.5" />
            {homeLabel}
          </Link>
        </>
      )}
    </div>
  );
}
