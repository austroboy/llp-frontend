"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Users,
  GitBranch,
  BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isMasterAdmin } from "@/lib/auth";
import { motion, MotionConfig, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

// ---------------------------------------------------------------------------
// Lazy-loaded tab components
// ---------------------------------------------------------------------------

const TabFallback = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)", padding: "var(--s-4)" }}>
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full rounded-lg" />
    ))}
  </div>
);

const EmailInboxTab = dynamic(
  () => import("./email-inbox-tab").then((m) => ({ default: m.EmailInboxTab })),
  { loading: TabFallback }
);

const EmailUsersTab = dynamic(
  () => import("./email-users-tab").then((m) => ({ default: m.EmailUsersTab })),
  { loading: TabFallback }
);

const EmailRoutingTab = dynamic(
  () => import("./email-routing-tab").then((m) => ({ default: m.EmailRoutingTab })),
  { loading: TabFallback }
);

const AnalyticsTab = dynamic(
  () => import("./analytics-tab").then((m) => ({ default: m.AnalyticsTab })),
  { loading: TabFallback }
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmailAdminPage() {
  const [activeTab, setActiveTab] = useState("inbox");
  const { user, isLoaded } = useUser();
  const masterAdmin = isMasterAdmin(user);

  // Defensive: if a non-master somehow lands on a master-only tab (e.g.
  // stale state after their privileges were revoked), bounce back to inbox.
  useEffect(() => {
    if (isLoaded && !masterAdmin && (activeTab === "users" || activeTab === "routing")) {
      setActiveTab("inbox");
    }
  }, [isLoaded, masterAdmin, activeTab]);

  return (
    <MotionConfig reducedMotion="user">
      {/* Hero */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ 4.1</span>
          Admin · Communications · Email
        </motion.div>
        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
          }}
        >
          Correspondence <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>registry.</em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: "60ch" }}
        >
          Inbox, routing, and delivery analytics under one cabinet.
        </motion.p>
        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            gap: "var(--s-2)",
            marginTop: "var(--s-4)",
            flexWrap: "wrap",
          }}
        >
          <span className="lf-meta" style={{ textTransform: "uppercase" }}>
            SES · <strong>laborlawpartner.com</strong>
          </span>
        </motion.div>
      </motion.section>

      {/* Tabs */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-5)" }}
      >
        <motion.div
          variants={fadeUp}
          style={{
            margin: "0 calc(-1 * var(--s-4)) 0",
            padding: "0 var(--s-4)",
            overflowX: "auto",
          }}
          className="no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="inbox">
                <Mail className="size-4 mr-1.5" />
                Inbox
              </TabsTrigger>
              {masterAdmin && (
                <TabsTrigger value="users">
                  <Users className="size-4 mr-1.5" />
                  Email Users
                </TabsTrigger>
              )}
              {masterAdmin && (
                <TabsTrigger value="routing">
                  <GitBranch className="size-4 mr-1.5" />
                  Routing
                </TabsTrigger>
              )}
              <TabsTrigger value="analytics">
                <BarChart3 className="size-4 mr-1.5" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>
      </motion.section>

      {/* Active tab content */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp}>
          {activeTab === "inbox" && <EmailInboxTab />}
          {activeTab === "users" && masterAdmin && <EmailUsersTab />}
          {activeTab === "routing" && masterAdmin && <EmailRoutingTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
        </motion.div>
      </motion.section>
    </MotionConfig>
  );
}
