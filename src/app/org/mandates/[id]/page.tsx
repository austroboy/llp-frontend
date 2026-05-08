"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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

const emptyCard: React.CSSProperties = {
  borderStyle: "dashed",
  borderColor: "var(--line-2)",
  background: "transparent",
  padding: "var(--s-6)",
  textAlign: "center",
};

const emptyText: React.CSSProperties = {
  color: "var(--ink-4)",
  fontStyle: "italic",
  margin: 0,
};

export default function MandateDetailPage() {
  const { id } = useParams();
  const mandateRef =
    typeof id === "string" ? id : Array.isArray(id) ? id[0] : "—";

  const sections: Array<{
    kicker: string;
    title: React.ReactNode;
    deck: string;
    empty: string;
  }> = [
    {
      kicker: "§ I Information",
      title: (
        <>
          Mandate <em>information.</em>
        </>
      ),
      deck: "Brief metadata, scope, and procedural context for this sourcing record.",
      empty:
        "Mandate metadata appears once the recruiter loads the brief.",
    },
    {
      kicker: "§ II Timeline",
      title: (
        <>
          Stage <em>timeline.</em>
        </>
      ),
      deck: "Sourcing → shortlist → interview → offer. Stages post here as the brief advances.",
      empty: "No events yet.",
    },
    {
      kicker: "§ III Shortlist",
      title: (
        <>
          Shortlisted <em>candidates.</em>
        </>
      ),
      deck: "Topsheet summaries and full CV access appear once the LLP team forwards candidates.",
      empty: "No candidates shortlisted yet.",
    },
    {
      kicker: "§ IV Clarifications",
      title: (
        <>
          Clarification <em>thread.</em>
        </>
      ),
      deck: "Exchanges with the LLP mandate lead are preserved here for the record.",
      empty: "No clarifications requested yet.",
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div style={{ marginBottom: "var(--s-4)" }}>
        <Link href="/org/mandates" className="lf-cta lf-cta--ghost">
          ← Mandates
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
          <span className="lf-kicker-mark">§</span>
          Mandate · {mandateRef}
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
          Mandate{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-blue)",
            }}
          >
            {mandateRef}.
          </em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: 640 }}
        >
          Information, stage transitions, shortlists, and the clarification
          thread for this sourcing brief — each filed below under its own
          clause.
        </motion.p>
      </motion.section>

      {sections.map((s) => (
        <motion.section
          key={s.kicker}
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
              <span className="lf-kicker-mark">{s.kicker.split(" ")[0]}</span>
              {s.kicker.split(" ").slice(1).join(" ")}
            </div>
            <h2 className="lf-h2" style={{ marginTop: "var(--s-2)" }}>
              {s.title}
            </h2>
            <p className="lf-section-deck">{s.deck}</p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="lf-card" style={emptyCard}>
              <p className="lf-body" style={emptyText}>
                {s.empty}
              </p>
            </div>
          </motion.div>
        </motion.section>
      ))}
    </MotionConfig>
  );
}
