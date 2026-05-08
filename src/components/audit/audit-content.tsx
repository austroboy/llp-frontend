"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { sanitize, inlineSchema } from "@/lib/sanitize-html";
import "@/components/landing/landing.css";
import "./audit-styles.css";

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

const HOW_STEPS = [
  {
    n: "01",
    title: "Pick an audit",
    desc: "PF live today. Gratuity and WPPF in Q2. Nine more audits launching on a weekly cadence through Q3.",
  },
  {
    n: "02",
    title: "Answer ten questions",
    desc: "Three about your organization, seven about your current practices. Honest answers surface specific red flags.",
  },
  {
    n: "03",
    title: "Receive the diagnostic",
    desc: "Compliance score 0-100, zone (red / amber / green), up to 4 named red flags, sequenced 30-day action plan.",
  },
  {
    n: "04",
    title: "Act on it",
    desc: "Report proposes routing to Ask LLP, Academy, Services Desk, or Expert Network based on the gaps it found.",
  },
];

const INSIGHTS = [
  {
    label: "Sector benchmark",
    stat: "22",
    unit: "% higher scores",
    desc:
      "Factories running a compliance self-audit before buyer visits score <strong>22% higher on H&M's scorecard</strong> than factories that audit reactively.",
  },
  {
    label: "Review standard",
    stat: "100",
    unit: "% editorially reviewed",
    desc:
      "Every diagnostic question and every red flag reviewed by <strong>Mehnaz Islam</strong> before the audit goes live. No AI-generated legal interpretation.",
  },
  {
    label: "Most common finding",
    stat: "62",
    unit: "% informal PF",
    desc:
      "Of RMG factories audited this quarter, <strong>62% had informal or cash-mode PF</strong>. This is the top finding in buyer audits.",
  },
];

type AuditCard = {
  title: string;
  desc: string;
  duration: string;
  legal: string;
  status: string;
};
type Category = { eyebrow: string; label: string; cards: AuditCard[] };

const CATEGORIES: Category[] = [
  {
    eyebrow: "Statutory financial benefits",
    label: "Worker welfare and benefits",
    cards: [
      {
        title: "Gratuity",
        desc: "Gratuity calculation, eligibility, settlement, and dispute exposure.",
        duration: "3 min",
        legal: "Section 236 · Chapter XIII",
        status: "Q2 2026",
      },
      {
        title: "WPPF",
        desc: "Workers' participation in profits and welfare fund compliance.",
        duration: "4 min",
        legal: "Sections 232-242",
        status: "Q2 2026",
      },
      {
        title: "Group insurance",
        desc: "Mandatory group insurance coverage for 100+ worker establishments.",
        duration: "3 min",
        legal: "Section 99",
        status: "Q3 2026",
      },
    ],
  },
  {
    eyebrow: "HR operations and discipline",
    label: "People processes",
    cards: [
      {
        title: "Domestic enquiry",
        desc: "Misconduct enquiry procedure, natural justice, panel composition.",
        duration: "4 min",
        legal: "Section 24 · Chapter VI",
        status: "Q2 2026",
      },
      {
        title: "Termination protocol",
        desc: "Retrenchment, dismissal, and termination compliance framework.",
        duration: "3 min",
        legal: "Section 26 · Section 27",
        status: "Q2 2026",
      },
      {
        title: "Grievance handling",
        desc: "Formal grievance-handling procedure and timeline compliance.",
        duration: "3 min",
        legal: "Section 33",
        status: "Q3 2026",
      },
    ],
  },
  {
    eyebrow: "External inspection readiness",
    label: "Audit preparedness",
    cards: [
      {
        title: "Buyer audit readiness",
        desc: "H&M, M&S, LWG, Walmart standard checkpoints. Document readiness.",
        duration: "5 min",
        legal: "Industry frameworks",
        status: "Q3 2026",
      },
      {
        title: "Labour Inspector visit",
        desc: "Statutory register readiness, filing currency, common Inspector findings.",
        duration: "4 min",
        legal: "DIFE checklist",
        status: "Q3 2026",
      },
    ],
  },
];

const ROUTES = [
  {
    trigger: "If the gap is understanding",
    name: "Ask LLP",
    desc: "Source-cited answers to specific questions that came up during the audit.",
    action: "Ask a question",
    href: "/chat",
  },
  {
    trigger: "If the gap is execution",
    name: "Services Desk",
    desc: "Filing, drafting, procedural support delivered by LLP.",
    action: "Start a job",
    href: "/services",
  },
  {
    trigger: "If the gap is capability",
    name: "Academy",
    desc: "Structured 5-session learning paths to build internal capability.",
    action: "Browse Path",
    href: "/academy",
  },
  {
    trigger: "If the gap is validation",
    name: "Expert Network",
    desc: "Named expert review of your current setup and fix plan.",
    action: "Book a reviewer",
    href: "/experts",
  },
];

export function AuditContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <section className="lf-au-wrap">
            <motion.header
              className="lf-au-hero"
              variants={heroStagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="lf-au-kicker">
                Self-Audit · Free diagnostic
              </motion.div>
              <motion.h1 variants={fadeUp} className="lf-au-title">
                Check your compliance health. <em>Four minutes.</em>
              </motion.h1>
              <motion.p variants={fadeUp} className="lf-au-deck">
                Answer ten questions about your establishment. Receive a diagnostic report with a
                compliance score, specific red flags, and a 30-day action plan. Grounded in the
                Labour Act. Always free. Anonymous by default.
              </motion.p>
              <motion.div variants={fadeUp} className="lf-au-cta-row">
                <Link href="/audit/start" className="lf-au-cta-primary">
                  <span>Start the PF Self-Audit</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </Link>
                <div className="lf-au-cta-meta">
                  <span>10 questions · 4 minutes</span>
                  <span>Anonymous · no signup</span>
                  <span>Shareable link valid 30 days</span>
                </div>
              </motion.div>
            </motion.header>

            <motion.div
              className="lf-au-how"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {HOW_STEPS.map((s) => (
                <motion.div variants={fadeUp} key={s.n} className="lf-au-step">
                  <span className="lf-au-step-num">{s.n}</span>
                  <h3 className="lf-au-step-title">{s.title}</h3>
                  <p className="lf-au-step-desc">{s.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="lf-au-insights"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {INSIGHTS.map((i) => (
                <motion.div variants={fadeUp} key={i.label} className="lf-au-insight">
                  <span className="lf-au-insight-label">{i.label}</span>
                  <h3 className="lf-au-insight-stat">
                    {i.stat}
                    <span className="unit">{i.unit}</span>
                  </h3>
                  <p
                    className="lf-au-insight-desc"
                    dangerouslySetInnerHTML={{ __html: sanitize(i.desc, inlineSchema) /* M-11 */ }}
                  />
                </motion.div>
              ))}
            </motion.div>

            <motion.section
              className="lf-au-featured"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-au-featured-kicker">
                Live today · start here
              </motion.div>
              <div className="lf-au-featured-grid">
                <motion.div variants={fadeUp}>
                  <h2 className="lf-au-featured-title">
                    Provident Fund <em>Self-Audit.</em>
                  </h2>
                  <p className="lf-au-featured-desc">
                    Ten questions, about four minutes. Compliance score 0-100, zone, named red
                    flags, sequenced 30-day action plan. Grounded in Section 264 and Chapter
                    XIII. No signup required.
                  </p>
                  <div className="lf-au-featured-meta">
                    <span>
                      Legal anchor · <strong>Section 264 · Chapter XIII</strong>
                    </span>
                    <span>
                      Duration · <strong>4 minutes</strong>
                    </span>
                    <span>
                      Report · <strong>Shareable 30 days</strong>
                    </span>
                  </div>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Link href="/audit/start" className="lf-au-featured-cta">
                    <span>Start the PF Self-Audit</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <div className="lf-au-featured-note">
                    Reviewed by <strong style={{ color: "#f8f6f1" }}>Mehnaz Islam</strong>
                  </div>
                </motion.div>
              </div>
            </motion.section>

            {CATEGORIES.map((cat, idx) => (
              <motion.section
                key={cat.label}
                className="lf-au-cat"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                <div className="lf-au-cat-head">
                  <span className="lf-au-cat-eyebrow">{cat.eyebrow}</span>
                  <div className="lf-au-cat-line" />
                  <h2 className="lf-au-cat-label">
                    Category {["I", "II", "III"][idx + 1] || ""} · {cat.label}
                  </h2>
                </div>
                <div className="lf-au-grid">
                  {cat.cards.map((c) => (
                    <motion.div variants={fadeUp} key={c.title} className="lf-au-card" data-locked="true">
                      <span className="lf-au-card-status">Coming soon</span>
                      <span className="lf-au-card-duration">{c.duration}</span>
                      <h3 className="lf-au-card-title">{c.title}</h3>
                      <p className="lf-au-card-desc">{c.desc}</p>
                      <div className="lf-au-card-legal">
                        <span>{c.legal}</span>
                        <span><strong>{c.status}</strong></span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}

            <motion.section
              className="lf-au-cross"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-au-cross-kicker">
                What happens after your audit
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-au-cross-title">
                Every audit proposes <em>the right next step.</em>
              </motion.h2>
              <motion.p variants={fadeUp} className="lf-au-cross-desc">
                The diagnostic report does not stop at findings. It proposes specific routing
                across the LLP ecosystem based on what your gaps look like.
              </motion.p>
              <motion.div variants={stagger} className="lf-au-cross-grid">
                {ROUTES.map((r) => (
                  <motion.div variants={fadeUp} key={r.name}>
                    <Link href={r.href} className="lf-au-route">
                      <span className="lf-au-route-trigger">{r.trigger}</span>
                      <span className="lf-au-route-name">{r.name}</span>
                      <span className="lf-au-route-desc">{r.desc}</span>
                      <span className="lf-au-route-action">{r.action}</span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>

            <div className="lf-au-stamp">
              <span>
                Reports are your property. Shareable link valid 30 days. Anonymous Twins
                discarded after 30 days if you do not sign up. Audit content authored and
                reviewed by <strong>Mehnaz Islam</strong>.
              </span>
              <span className="lf-au-stamp-right">
                <span>Foundation v1.9</span>
                <span>Content v2026.04.24</span>
              </span>
            </div>
          </section>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
