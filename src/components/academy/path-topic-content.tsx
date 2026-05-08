"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { sanitize, inlineSchema } from "@/lib/sanitize-html";
import "@/components/landing/landing.css";
import "./path-styles.css";

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

const SESSIONS = [
  { n: 1, s: "Sort", title: "Do we need a PF?", sub: "Is PF mandatory, optional, or inapplicable for your company, and why?", duration: "25 min", asset: "Applicability Decision Tree" },
  { n: 2, s: "Set", title: "What would good look like?", sub: "What does a compliant, audit-grade PF structure actually look like?", duration: "25 min", asset: "Readiness Scorecard" },
  { n: 3, s: "Shine", title: "Where are our gaps?", sub: "What specifically needs to change between today and ready?", duration: "25 min", asset: "Gap Roadmap" },
  { n: 4, s: "Standardize", title: "What does the lawyer need?", sub: "What do I hand to the lawyer so their job is review, not draft?", duration: "25 min", asset: "Lawyer Brief Pack" },
  { n: 5, s: "Sustain", title: "What happens after setup?", sub: "How do we keep this alive over the years?", duration: "25 min", asset: "Operations Rhythm" },
];

export function PathTopicContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <section className="lf-pl-wrap">
            <motion.header
              className="lf-pl-hero"
              variants={heroStagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="lf-pl-kicker">
                The Path topics · Provident Fund
              </motion.div>
              <motion.h1 variants={fadeUp} className="lf-pl-title">
                Become the person at your factory who actually <em>knows PF.</em>
              </motion.h1>
              <motion.p variants={fadeUp} className="lf-pl-deck">
                Five sessions, twenty-five minutes each. By the end you have a defensible
                applicability verdict, a readiness scorecard, a gap roadmap, a lawyer brief,
                and an operating rhythm. Cited. Human-reviewed. Yours forever.
              </motion.p>
              <motion.div
                variants={fadeUp}
                style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-3)", alignItems: "center" }}
              >
                <Link href="/academy/start" className="lf-pl-cta">
                  <span>Begin the PF Path · Session 1 free</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
                <span className="lf-pl-cta-meta">2.5 hrs total · Self-paced · ৳990 founding price</span>
              </motion.div>
            </motion.header>

            <motion.div
              className="lf-pl-stats"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {[
                { big: "5", label: "Sessions", sub: "25 min each" },
                { big: "5", label: "Assets you keep", sub: "All downloadable" },
                { big: "1", label: "Editorial reviewer", sub: "Mehnaz Islam" },
              ].map((s) => (
                <motion.div variants={fadeUp} key={s.label} className="lf-pl-stat">
                  <div className="lf-pl-stat-big">{s.big}</div>
                  <div className="lf-pl-stat-label">{s.label}</div>
                  <div className="lf-pl-stat-sub">{s.sub}</div>
                </motion.div>
              ))}
            </motion.div>

            <motion.section
              className="lf-pl-section"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-pl-section-kicker">
                The five sessions
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-pl-section-title">
                Five sessions, <em>one defensible setup.</em>
              </motion.h2>
              <motion.div variants={stagger} className="lf-pl-sessions">
                {SESSIONS.map((sess) => {
                  const locked = sess.n > 1;
                  return (
                    <motion.div variants={fadeUp} key={sess.n}>
                      <Link
                        href={locked ? "#pricing" : `/academy/session/${sess.n}`}
                        className="lf-pl-session"
                        data-locked={locked}
                        aria-disabled={locked}
                      >
                        <div className="lf-pl-session-badge">
                          <div className="lf-pl-session-n">Session {sess.n}</div>
                          <div className="lf-pl-session-s">{sess.s}</div>
                        </div>
                        <div>
                          <h3 className="lf-pl-session-title">{sess.title}</h3>
                          <div className="lf-pl-session-sub">{sess.sub}</div>
                        </div>
                        <div className="lf-pl-session-meta">
                          <span className="lf-pl-session-tag" data-locked-tag={locked}>
                            {locked ? "Locked · ৳990" : "Free"}
                          </span>
                          <span>{sess.duration}</span>
                          <span style={{ fontStyle: "italic" }}>Asset · {sess.asset}</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.section>

            <motion.section
              className="lf-pl-section"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-pl-section-kicker">
                Why this works
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-pl-section-title">
                Source-grounded. Human-reviewed. <em>Cited, always.</em>
              </motion.h2>
              <motion.div variants={stagger} className="lf-pl-cred">
                {[
                  {
                    t: "Source-grounded.",
                    b: "Every legal claim traces to a named section in the law. Editorial voice always names a primary source.",
                  },
                  {
                    t: "Human-reviewed.",
                    b: "Every session word-by-word approved by <strong>Mehnaz Islam</strong> before activation.",
                  },
                  {
                    t: "Cited, always.",
                    b: "Editorial voice sits alongside the law, with the primary section linked every time it is referenced.",
                  },
                ].map((c) => (
                  <motion.div variants={fadeUp} key={c.t} className="lf-pl-cred-block">
                    <h3 className="lf-pl-cred-title">{c.t}</h3>
                    <p
                      className="lf-pl-cred-body"
                      dangerouslySetInnerHTML={{ __html: sanitize(c.b, inlineSchema) /* M-11 */ }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>

            <motion.section
              id="pricing"
              className="lf-pl-section"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-pl-price">
                <div className="lf-pl-section-kicker">Founding pricing · PF Path</div>
                <h2 className="lf-pl-section-title">
                  Session 1 free. Sessions 2-5 <em>once, forever.</em>
                </h2>
                <div className="lf-pl-price-row">
                  <div className="lf-pl-price-amount">৳990</div>
                  <div className="lf-pl-price-regular">Regular ৳1,500</div>
                  <div className="lf-pl-price-note">First 100 learners</div>
                </div>
                <Link href="/academy/start" className="lf-pl-cta">
                  <span>Begin the PF Path · Session 1 free</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </motion.div>
            </motion.section>
          </section>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
