"use client";

import { ReactNode, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";
import {
  AdminSidebar,
  primaryDockItems,
  moreDockItems,
} from "@/components/admin/admin-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SidebarProvider } from "@/components/providers/sidebar-context";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { isMasterAdmin } from "@/lib/auth";
import "@/components/landing/landing.css";
import "@/components/dashboard/dashboard-shell.css";

const MASTER_ONLY_HREFS = new Set(["/admin/email"]);

function AdminInner({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const { user } = useUser();
  const master = isMasterAdmin(user);
  const visiblePrimary = master
    ? primaryDockItems
    : primaryDockItems.filter((i) => !MASTER_ONLY_HREFS.has(i.href));
  const visibleMore = master
    ? moreDockItems
    : moreDockItems.filter((i) => !MASTER_ONLY_HREFS.has(i.href));

  return (
    <div
      className="lf-page dash-page"
      data-theme={themeAttr}
      suppressHydrationWarning
    >
      <SiteTopNav />
      <div className="dash-shell">
        <AdminSidebar />
        <main className="dash-content">{children}</main>
      </div>
      <MobileBottomNav items={visiblePrimary} moreItems={visibleMore} />
    </div>
  );
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AdminInner>{children}</AdminInner>
    </SidebarProvider>
  );
}
