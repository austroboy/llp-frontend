"use client";

import { ReactNode, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ProtocolDashboardSidebar,
  protocolMobileNavItems,
  protocolMobileMoreItems,
} from "@/components/dashboard/protocol-dashboard-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SidebarProvider } from "@/components/providers/sidebar-context";
import { SiteTopNav } from "@/components/site/site-top-nav";
import "@/components/landing/landing.css";
import "@/components/dashboard/dashboard-shell.css";

function DashboardInner({ children }: { children: ReactNode }) {
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
        <ProtocolDashboardSidebar />
        <main className="dash-content">{children}</main>
      </div>

      <MobileBottomNav
        items={protocolMobileNavItems}
        moreItems={protocolMobileMoreItems}
      />
    </div>
  );
}

export function DashboardLayoutClient({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardInner>{children}</DashboardInner>
    </SidebarProvider>
  );
}
