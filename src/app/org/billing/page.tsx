"use client";

import { type CSSProperties } from "react";
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

const hairlineGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "1px",
  background: "var(--glass-border)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--r-lg)",
  overflow: "hidden",
};

const hairlineCell: CSSProperties = {
  background: "var(--glass-bg)",
  padding: "var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--s-2)",
  height: "100%",
};

const metrics = [
  { label: "Outstanding", value: "৳0", unit: "due", note: "Invoices awaiting settlement." },
  { label: "Last 30 days", value: "৳0", unit: "billed", note: "Engagement billing across the past month." },
  { label: "Lifetime", value: "৳0", unit: "settled", note: "Total settled value with LLP since inception." },
  { label: "Invoices", value: "0", unit: "on file", note: "Issued, paid, disputed — full ledger." },
];

export default function OrgBillingPage() {
  return (
    <MotionConfig reducedMotion="user">
      {/* -- Hero ------------------------------------------------ */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ I</span>
          Organization Desk · Billing
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
            billing ledger.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 680 }}
        >
          Invoices, payment status, and engagement settlements live here.
        </motion.p>
      </motion.section>

      {/* -- Hairline 4-up summary ------------------------------- */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ ...hairlineGrid, marginBottom: "var(--s-7)" }}
      >
        {metrics.map((m) => (
          <motion.div key={m.label} variants={fadeUp}>
            <div style={hairlineCell}>
              <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                {m.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 32,
                  fontWeight: 400,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                {m.value}
                <span
                  style={{
                    fontFamily: "var(--lf-mono)",
                    fontSize: 11,
                    color: "var(--ink-4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {m.unit}
                </span>
              </span>
              <span
                className="lf-body"
                style={{ fontSize: 13, color: "var(--ink-3)" }}
              >
                {m.note}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* -- §II Invoices ---------------------------------------- */}
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
          style={{ marginBottom: "var(--s-4)" }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ II</span>
            Invoices
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            The <em>full ledger.</em>
          </h2>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="lf-card"
          style={{
            borderStyle: "dashed",
            padding: "var(--s-6)",
            textAlign: "center",
          }}
        >
          <h3 className="lf-h3" style={{ margin: 0 }}>
            No invoices yet
          </h3>
          <p
            className="lf-body"
            style={{
              color: "var(--ink-3)",
              fontStyle: "italic",
              marginTop: "var(--s-2)",
            }}
          >
            They appear after a service request is accepted and engaged.
          </p>
        </motion.div>
      </motion.section>
    </MotionConfig>
  );
}
