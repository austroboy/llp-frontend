"use client";

import { GraduationCap, BookOpen, Award, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

type Programme = {
  kicker: string;
  title: string;
  titleAccent: string;
  description: string;
  Icon: LucideIcon;
};

const PROGRAMMES: Programme[] = [
  {
    kicker: "Foundation",
    title: "Labour-law",
    titleAccent: "core curriculum.",
    description:
      "BLA 2006, amendments through 2026, and Rules 2015 — for HR leads and line managers stepping into compliance.",
    Icon: BookOpen,
  },
  {
    kicker: "Certification",
    title: "Compliance",
    titleAccent: "with assessment.",
    description:
      "Factory, establishment, and group-insurance compliance — assessed cohort, certificate on completion.",
    Icon: Award,
  },
  {
    kicker: "Practice",
    title: "Modern HR",
    titleAccent: "playbooks.",
    description:
      "Onboarding, performance, grievance, separation — procedural playbooks the modern HR team can adopt week one.",
    Icon: Users,
  },
  {
    kicker: "Bespoke",
    title: "Private",
    titleAccent: "cohorts.",
    description:
      "Custom cohorts scoped to your sector and headcount — content tuned to the law as it actually applies to your floor.",
    Icon: GraduationCap,
  },
];

export default function OrgAcademyPage() {
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
          Organization Desk · LLP Academy
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
          Learn at{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            your pace.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Structured programmes for your team — LLP Path, focused workshops,
          and certifications. Cohort-based, recorded, and certificated where it
          matters.
        </motion.p>
      </motion.section>

      {/* -- Active programmes ----------------------------------- */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-6)" }}
      >
        <motion.div
          variants={fadeUp}
          className="lf-section-header"
          style={{ marginBottom: "var(--s-5)" }}
        >
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ II</span>
            Active programmes
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            Four tracks <em>open now.</em>
          </h2>
          <p className="lf-section-deck">
            Pick a track. Each one issues a saved artifact — notes, scorecard,
            or certificate — to your organization library.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--s-4)",
          }}
        >
          {PROGRAMMES.map((p) => {
            const Icon = p.Icon;
            return (
              <motion.div key={p.kicker} variants={fadeUp}>
                <div
                  className="lf-card lf-card--hover"
                  style={{
                    display: "block",
                    height: "100%",
                    padding: "var(--s-5)",
                  }}
                >
                  <span
                    className="lf-meta"
                    style={{
                      textTransform: "uppercase",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Icon
                      size={14}
                      style={{ color: "var(--accent-blue)" }}
                    />
                    {p.kicker}
                  </span>
                  <h3
                    className="lf-h3"
                    style={{ margin: "var(--s-3) 0 var(--s-2)" }}
                  >
                    {p.title} <em>{p.titleAccent}</em>
                  </h3>
                  <p
                    className="lf-body"
                    style={{
                      color: "var(--ink-3)",
                      marginBottom: "var(--s-4)",
                    }}
                  >
                    {p.description}
                  </p>
                  <span className="lf-meta">Enrol →</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* -- Empty-state — more programmes coming -------------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        viewport={inViewOnce}
        className="lf-card"
        style={{
          marginBottom: "var(--s-7)",
          padding: "var(--s-5) var(--s-6)",
          border: "1px dashed var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "var(--paper-inner)",
          textAlign: "center",
        }}
      >
        <span
          className="lf-meta"
          style={{
            textTransform: "uppercase",
            display: "block",
            marginBottom: "var(--s-2)",
          }}
        >
          On record · No enrolments yet
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
          More programmes coming soon. Once team members enrol, progress and
          certificates file here under the organization.
        </p>
      </motion.div>
    </MotionConfig>
  );
}
