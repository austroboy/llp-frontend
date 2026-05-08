"use client";

import { FileText, ClipboardList, ShieldCheck, Wrench } from "lucide-react";
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

type ResourceCard = {
  kicker: string;
  title: string;
  titleAccent: string;
  description: string;
  Icon: LucideIcon;
};

const TEMPLATES: ResourceCard[] = [
  {
    kicker: "Contracts",
    title: "Employment",
    titleAccent: "& service templates.",
    description:
      "Employment, service, and contractor agreements aligned with current labour law and amendments through 2026.",
    Icon: FileText,
  },
  {
    kicker: "Procedure",
    title: "HR",
    titleAccent: "standard operating procedures.",
    description:
      "Onboarding, leave, grievance, and separation playbooks — versioned, auditable, ready to adopt.",
    Icon: ClipboardList,
  },
  {
    kicker: "Compliance",
    title: "Audit",
    titleAccent: "checklists.",
    description:
      "Factory, establishment, and group-insurance checklists kept current with the latest amendments.",
    Icon: ShieldCheck,
  },
  {
    kicker: "Tools",
    title: "Lightweight",
    titleAccent: "calculators & utilities.",
    description:
      "Gratuity calculator, notice-period planner, and other utilities — quick numbers, citable outputs.",
    Icon: Wrench,
  },
];

export default function OrgResourcesPage() {
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
          Organization Desk · Resources
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
          Templates and{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            artifacts.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Production-ready employment contracts, HR SOPs, compliance audit
          checklists, and lightweight tools — issued and maintained by the LLP
          team.
        </motion.p>
      </motion.section>

      {/* -- Available templates --------------------------------- */}
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
            Available templates
          </div>
          <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
            Four categories <em>to draw from.</em>
          </h2>
          <p className="lf-section-deck">
            Each artifact is current with the live amendment chain and
            reviewable against its source citation.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--s-4)",
          }}
        >
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.Icon;
            return (
              <motion.div key={tpl.kicker} variants={fadeUp}>
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
                    {tpl.kicker}
                  </span>
                  <h3
                    className="lf-h3"
                    style={{ margin: "var(--s-3) 0 var(--s-2)" }}
                  >
                    {tpl.title} <em>{tpl.titleAccent}</em>
                  </h3>
                  <p
                    className="lf-body"
                    style={{
                      color: "var(--ink-3)",
                      marginBottom: "var(--s-4)",
                    }}
                  >
                    {tpl.description}
                  </p>
                  <span className="lf-meta">Open →</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </MotionConfig>
  );
}
