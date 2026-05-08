"use client";

import Link from "next/link";
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

export default function OrgMandatesPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div style={{ marginBottom: "var(--s-4)" }}>
        <Link href="/org" className="lf-cta lf-cta--ghost">
          ← Back to Desk
        </Link>
      </div>

      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ I</span>
          Organization Desk · Mandates
        </motion.div>

        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(40px, 5.6vw, 64px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
          }}
        >
          Your{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            mandate ledger.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Confidential mandates assigned to LLP recruiters appear here once your
          hiring request is accepted.
        </motion.p>
      </motion.section>

      {/* -- Active mandates ------------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-7)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{ marginBottom: "var(--s-5)" }}
        >
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            Active <em>mandates.</em>
          </h2>
          <p className="lf-section-deck">
            Confidential briefs threaded with clarifications, shortlists, and
            stage transitions.
          </p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div
            className="lf-card"
            style={{
              borderStyle: "dashed",
              borderColor: "var(--line-2)",
              background: "transparent",
              padding: "var(--s-6)",
              textAlign: "center",
            }}
          >
            <p
              className="lf-body"
              style={{
                color: "var(--ink-4)",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              No mandates yet. They appear after a hiring request is accepted by
              the recruiter team.
            </p>
          </div>
        </motion.div>
      </motion.section>
    </MotionConfig>
  );
}
