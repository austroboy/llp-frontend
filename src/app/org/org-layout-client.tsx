"use client";

import { ReactNode, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  OrgSidebar,
  orgMobileNavItems,
  orgMobileMoreItems,
} from "@/components/org/org-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SidebarProvider } from "@/components/providers/sidebar-context";
import { SiteTopNav } from "@/components/site/site-top-nav";
import "@/components/landing/landing.css";
import "@/components/dashboard/dashboard-shell.css";

function OrgInner({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <div
      className="lf-page dash-page"
      data-theme={themeAttr}
      suppressHydrationWarning
    >
      <SiteTopNav />

      <div className="dash-shell">
        <OrgSidebar />
        <main className="dash-content">{children}</main>
      </div>

      <MobileBottomNav
        items={orgMobileNavItems}
        moreItems={orgMobileMoreItems}
      />
    </div>
  );
}

export function OrgLayoutClient({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <OrgInner>{children}</OrgInner>
    </SidebarProvider>
  );
}
