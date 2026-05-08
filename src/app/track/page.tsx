"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { MotionConfig } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { OrderLookupForm } from "@/components/track/order-lookup-form";
import "@/components/landing/landing.css";

export default function TrackPage(): ReactNode {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "light";

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />
        <main>
          <OrderLookupForm />
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
