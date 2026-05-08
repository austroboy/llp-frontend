"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
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

const TabFallback = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)", padding: "var(--s-4)" }}>
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full rounded-lg" />
    ))}
  </div>
);

const SubscribersTab = dynamic(
  () =>
    import("@/app/admin/email/subscribers-tab").then((m) => ({
      default: m.SubscribersTab,
    })),
  { loading: TabFallback }
);

export default function SubscribersAdminPage() {
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
          <span className="lf-kicker-mark">§ 4.2</span>
          Admin · Communications · Subscribers
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
          Subscriber <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>registry.</em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: "60ch" }}
        >
          Newsletter subscribers, segmentation tags, CSV import/export, and source attribution under one cabinet.
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
            Source · <strong>website_form · csv_import · admin_manual</strong>
          </span>
        </motion.div>
      </motion.section>

      {/* Subscribers section */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp}>
          <SubscribersTab />
        </motion.div>
      </motion.section>
    </MotionConfig>
  );
}
