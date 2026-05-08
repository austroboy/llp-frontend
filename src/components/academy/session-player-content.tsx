"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";
import "./path-styles.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const SESSIONS = {
  1: {
    s: "Sort",
    title: "Do we need a PF?",
    methodology: "5S Foundation",
  },
  2: { s: "Set", title: "What would good look like?", methodology: "5S Foundation" },
  3: { s: "Shine", title: "Where are our gaps?", methodology: "5S Foundation" },
  4: { s: "Standardize", title: "What does the lawyer need?", methodology: "5S Foundation" },
  5: { s: "Sustain", title: "What happens after setup?", methodology: "5S Foundation" },
} as const;

type SessionId = keyof typeof SESSIONS;

type IntakeShape = {
  firstName?: string;
  company?: string;
  sector?: string;
  pfStatus?: string;
};

type Props = { sessionId: number };

export function SessionPlayerContent({ sessionId }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const [intake, setIntake] = useState<IntakeShape>({});
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lf-path-intake");
      if (raw) setIntake(JSON.parse(raw));
    } catch {}
  }, []);

  const id = (sessionId as SessionId) ?? 1;
  const sess = SESSIONS[id] ?? SESSIONS[1];
  const firstName = intake.firstName?.trim() || "Learner";
  const company = intake.company?.trim() || "your company";
  const sector = intake.sector || "RMG Knit";
  const greenfield = intake.pfStatus === "none" || intake.pfStatus === "starting";

  const isLocked = id !== 1;

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <div className="lf-sp-shell">
            <header className="lf-sp-header">
              <div className="lf-sp-brand">
                <div className="lf-sp-mark">L</div>
                <div>
                  <div className="lf-sp-brand-name">Path</div>
                  <div className="lf-sp-brand-sub">by Labor Law Partner</div>
                </div>
                <span className="lf-sp-method">
                  <span>Your pathway</span>
                  <strong>{sess.methodology}</strong>
                </span>
              </div>
              <Link href="/academy/pf" className="lf-sp-exit">
                Exit to topic
              </Link>
            </header>

            <div className="lf-sp-progress">
              <span>
                Session {id} · <strong>{sess.s}</strong>
              </span>
              <div className="lf-sp-progress-track">
                <div
                  className="lf-sp-progress-fill"
                  style={{ width: `${isLocked ? 0 : 17}%` }}
                />
              </div>
              <span>
                <span>{isLocked ? 0 : 17}</span>%
              </span>
            </div>

            {isLocked ? (
              <div className="lf-sp-locked">
                <div className="lf-sp-locked-kicker">Session {id} · Locked</div>
                <h1 className="lf-sp-locked-title">{sess.title}</h1>
                <p className="lf-sp-locked-deck">
                  Sessions 2-5 unlock together for <strong>৳990</strong> founding price.
                  Session 1 is free and gives you the Applicability Decision Tree on its own.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "var(--s-2)", flexWrap: "wrap" }}>
                  <Link href="/academy/session/1" className="lf-pl-cta">
                    Try Session 1 free →
                  </Link>
                  <Link href="/academy/pf#pricing" className="lf-pl-cta" style={{ background: "transparent", color: "var(--ink)", border: "1px solid var(--line-2)" }}>
                    Unlock 2-5 · ৳990
                  </Link>
                </div>
              </div>
            ) : (
              <motion.div className="lf-sp-body" variants={stagger} initial="hidden" animate="show">
                {/* Block 1: intro + industry context */}
                <motion.section variants={fadeUp} className="lf-sp-block">
                  <div className="lf-sp-block-num">
                    Block 1 of 6 <strong>· Industry context</strong>
                  </div>
                  <div className="lf-sp-ctx">
                    <div className="lf-sp-ctx-item">
                      <span className="lf-sp-ctx-label">Sector</span>
                      <span className="lf-sp-ctx-value">{sector}</span>
                      <span className="lf-sp-ctx-sub">Curated for buyer-audit pressure.</span>
                    </div>
                    <div className="lf-sp-ctx-item">
                      <span className="lf-sp-ctx-label">Stage</span>
                      <span className="lf-sp-ctx-value">{greenfield ? "Greenfield" : "Brownfield"}</span>
                      <span className="lf-sp-ctx-sub">{greenfield ? "Building from zero." : "PF exists, refresh-mode."}</span>
                    </div>
                    <div className="lf-sp-ctx-item">
                      <span className="lf-sp-ctx-label">Methodology</span>
                      <span className="lf-sp-ctx-value">{sess.methodology}</span>
                      <span className="lf-sp-ctx-sub">Sort the question before solving it.</span>
                    </div>
                  </div>
                  <h1 className="lf-sp-block-title">
                    Do we <em>need</em> a PF?
                  </h1>
                  <div className="lf-sp-prose">
                    <p>
                      Welcome to Session 1, <strong>{firstName}</strong>. This is the{" "}
                      <em>Sort</em> phase of the 5S methodology. Your job here is simple
                      and important: figure out whether the Provident Fund is mandatory for{" "}
                      <strong>{company}</strong>, optional, or not applicable at all.
                    </p>
                    <p>
                      By the end you'll have an <em>Applicability Decision Tree</em> for
                      your company — one page, with a verdict, legal grounding, and what
                      your Director needs to hear.
                    </p>
                  </div>
                </motion.section>

                {/* Block 2: First principle */}
                <motion.section variants={fadeUp} className="lf-sp-block">
                  <div className="lf-sp-block-num">
                    Block 2 of 6 <strong>· First principle</strong>
                  </div>
                  <h2 className="lf-sp-block-title">The law behind the question.</h2>
                  <div className="lf-sp-prose">
                    <p>
                      Section 264 of the Labour Act 2006 frames a Provident Fund as
                      mandatory once an establishment has been in operation for three
                      years and three-fourths of the workers ask for one in writing.
                      Below those triggers, the PF is technically optional. In practice,
                      buyer audits and worker confidence push most factories above 100
                      workers to set one up regardless.
                    </p>
                  </div>
                  <div className="lf-sp-citation">
                    <svg className="lf-sp-citation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M6 3h6l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                      <path d="M12 3v6h6" />
                    </svg>
                    <p className="lf-sp-citation-text">
                      <strong>Bangladesh Labour Act 2006 · Section 264.</strong>
                      Threshold language verbatim. The 2025 Ordinance left this provision
                      untouched.
                    </p>
                  </div>
                </motion.section>

                {/* Block 3: Two realities */}
                <motion.section variants={fadeUp} className="lf-sp-block">
                  <div className="lf-sp-block-num">
                    Block 3 of 6 <strong>· Two realities</strong>
                  </div>
                  <h2 className="lf-sp-block-title">
                    Two realities that push most factories to set up <em>anyway.</em>
                  </h2>
                  <div className="lf-sp-prose">
                    <p>
                      <strong>Reality one: buyer scorecards.</strong> H&amp;M, M&amp;S,
                      Walmart, and Inditex all count an active, registered PF as a
                      baseline checkpoint. Factories without one routinely lose 10-15%
                      on social-compliance scorecards.
                    </p>
                    <p>
                      <strong>Reality two: Section 264 trigger.</strong> Once 75% of your
                      workers ask in writing, you have 90 days to set one up. The
                      cleanest path is to set one up before the request, on your own
                      timing.
                    </p>
                  </div>
                </motion.section>

                {/* Block 4: Director question (scenario) */}
                <motion.section variants={fadeUp} className="lf-sp-block">
                  <div className="lf-sp-block-num">
                    Block 4 of 6 <strong>· Scenario</strong>
                  </div>
                  <h2 className="lf-sp-block-title">
                    Your Director asks: <em>"Do we actually need a PF?"</em>
                  </h2>
                  <div className="lf-sp-prose">
                    <p>
                      The right answer is rarely "yes, the law makes us." The right answer
                      is "the law makes us under conditions A and B; outside those, it's a
                      buyer-audit and worker-trust decision." Lead with the legal trigger,
                      then frame the buyer reality. Your Director needs both halves to
                      decide.
                    </p>
                  </div>
                  <div className="lf-sp-callout">
                    <div className="lf-sp-callout-label">Coaching note</div>
                    <p className="lf-sp-callout-text">
                      Avoid yes/no. The PF question is structurally a "depending on what
                      we want to be." A defensible verdict reads: "Mandatory under
                      Section 264 once X happens, optional today, but recommended given Y."
                    </p>
                  </div>
                </motion.section>

                {/* Block 5: Apply */}
                <motion.section variants={fadeUp} className="lf-sp-block">
                  <div className="lf-sp-block-num">
                    Block 5 of 6 <strong>· Apply to your company</strong>
                  </div>
                  <h2 className="lf-sp-block-title">Apply this to {company}.</h2>
                  <div className="lf-sp-prose">
                    <p>
                      Walk through four questions about your establishment in the live
                      Path workbench: years in operation, worker count, written PF
                      request status, and current buyer pressure. The decision tree fills
                      in as you go. Your verdict appears at the bottom with the legal
                      grounding inline.
                    </p>
                  </div>
                </motion.section>

                {/* Block 6: Decision tree asset */}
                <motion.section variants={fadeUp} className="lf-sp-block">
                  <div className="lf-sp-block-num">
                    Block 6 of 6 <strong>· Your asset</strong>
                  </div>
                  <h2 className="lf-sp-block-title">Your Applicability Decision Tree.</h2>
                  <div className="lf-sp-prose">
                    <p>
                      One page, with the verdict at top, the legal grounding immediately
                      below, and the four-question logic underneath. WhatsApp-shareable.
                      Yours forever — re-runnable anytime your context changes.
                    </p>
                  </div>
                  <div className="lf-sp-callout">
                    <div className="lf-sp-callout-label">Continue</div>
                    <p className="lf-sp-callout-text">
                      Sessions 2-5 build on this verdict — readiness scorecard, gap
                      roadmap, lawyer brief, operating rhythm — for ৳990 once, yours
                      forever.
                    </p>
                  </div>
                  <div className="lf-sp-cta-row">
                    <Link href="/academy/pf" className="lf-pi-back">
                      ← Back to topic
                    </Link>
                    <Link href="/academy/pf#pricing" className="lf-pl-cta">
                      <span>Continue to Sessions 2-5 · ৳990</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  </div>
                </motion.section>
              </motion.div>
            )}
          </div>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
