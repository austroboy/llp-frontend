"use client";

import { use, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { MotionConfig } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { OrderLookupForm } from "@/components/track/order-lookup-form";
import "@/components/landing/landing.css";

export default function TrackOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): ReactNode {
  const { orderNumber } = use(params);
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
          <OrderLookupForm initialOrderNumber={orderNumber.toUpperCase()} />
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
