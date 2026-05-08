"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

type StepCard = {
  kicker: string;
  title: string;
  titleAccent: string;
  description: string;
  cta: string;
  href?: string;
  feature?: boolean;
};

const STEPS: StepCard[] = [
  {
    kicker: "1 · Brief us",
    title: "Tell us",
    titleAccent: "what you need.",
    description:
      "Describe the mandate — domain, scope, timeline, sensitivity. The brief becomes the anchor for everything that follows.",
    cta: "Open directory",
    href: "/experts#directory",
    feature: true,
  },
  {
    kicker: "2 · We match",
    title: "We introduce",
    titleAccent: "two or three candidates.",
    description:
      "Independent specialists in labour-law, compliance, talent strategy, and dispute resolution — vetted against your brief.",
    cta: "How matching works",
  },
  {
    kicker: "3 · You engage",
    title: "Confirm rate,",
    titleAccent: "sign brief, work begins.",
    description:
      "Deliverables, timeline, and fee fixed before start. One-off briefings or sustained advisory — both supported.",
    cta: "Engagement terms",
  },
];

export default function OrgExpertsPage() {
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
          Organization Desk · Expert consultation
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
          Engage{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            subject-matter experts.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Independent advisors with deep domain knowledge — labour-law,
          compliance, talent strategy, dispute resolution. One-off briefings or
          sustained advisory.
        </motion.p>

        <motion.div
          variants={fadeUp}
          style={{
            display: "flex",
            gap: "var(--s-2)",
            marginTop: "var(--s-4)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/experts#directory"
            className="lf-cta lf-cta--primary"
          >
            Browse expert directory
            <ArrowRight size={14} style={{ marginLeft: 8 }} />
          </Link>
          <Link href="/org" className="lf-cta lf-cta--ghost">
            Back to Organization Desk
          </Link>
        </motion.div>
      </motion.section>

      {/* -- How it works --------------------------------------- */}
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
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ II</span>
            How it works
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            Three steps <em>from brief to engagement.</em>
          </h2>
          <p className="lf-section-deck">
            Each step produces a written record — brief, shortlist, signed
            engagement.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--s-4)",
          }}
        >
          {STEPS.map((step) => {
            const cardClass = step.feature
              ? "lf-card lf-card--feature lf-card--hover"
              : "lf-card lf-card--hover";
            const cardStyle = {
              display: "block" as const,
              height: "100%",
              textDecoration: "none" as const,
              ...(step.feature ? {} : { padding: "var(--s-5)" }),
            };
            const inner = (
              <>
                <span
                  className={
                    step.feature ? "lf-meta lf-meta--accent" : "lf-meta"
                  }
                  style={{ textTransform: "uppercase" }}
                >
                  {step.feature ? `● ${step.kicker}` : step.kicker}
                </span>
                <h3
                  className="lf-h3"
                  style={{ margin: "var(--s-3) 0 var(--s-2)" }}
                >
                  {step.title}{" "}
                  <em>{step.titleAccent}</em>
                </h3>
                <p
                  className="lf-body"
                  style={{
                    color: "var(--ink-3)",
                    marginBottom: "var(--s-4)",
                  }}
                >
                  {step.description}
                </p>
                <span className="lf-meta">{step.cta} →</span>
              </>
            );

            return (
              <motion.div key={step.kicker} variants={fadeUp}>
                {step.href ? (
                  <Link
                    href={step.href}
                    className={cardClass}
                    style={cardStyle}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className={cardClass} style={cardStyle}>
                    {inner}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* -- Bottom CTA ----------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        viewport={inViewOnce}
        className="lf-card"
        style={{
          marginBottom: "var(--s-7)",
          padding: "var(--s-5) var(--s-6)",
          background: "var(--accent-blue-ghost)",
          borderLeft: "2px solid var(--accent-blue)",
          borderRadius: "var(--r-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--s-4)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span
            className="lf-meta lf-meta--accent"
            style={{
              textTransform: "uppercase",
              display: "block",
              marginBottom: "var(--s-2)",
            }}
          >
            Ready to begin
          </span>
          <p
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 22,
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Browse the directory and file a brief in minutes.
          </p>
        </div>
        <Link href="/experts#directory" className="lf-cta lf-cta--primary">
          Browse expert directory
          <ArrowRight size={14} style={{ marginLeft: 8 }} />
        </Link>
      </motion.div>
    </MotionConfig>
  );
}
