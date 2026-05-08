"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { sanitize, inlineSchema } from "@/lib/sanitize-html";
import "@/components/landing/landing.css";
import "./research-styles.css";

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

type Node = { id: string; label: string; meta: string; amended?: boolean; isNucleus?: boolean };
type Authority = { id: string; label: string; sublabel: string };
type Composition = {
  query: string;
  situation: string;
  meta: string;
  primary: Node;
  supporting: Node[];
  crossCorpus: Node[];
  authorities: Authority[];
};

const COMPOSITIONS: Record<string, Composition> = {
  termination: {
    query: "Terminating a worker for absence",
    situation:
      "Your situation touches <strong>Section 27 (absence and loss of lien)</strong> and <strong>Section 23 (dismissal for misconduct)</strong> of the Labour Act 2006, with the <strong>2013 Amendment</strong> codifying the show-cause procedure. Final settlement crosses into <strong>Chapter VII of the Income Tax Act 2023</strong> for tax on separation payments, and into the <strong>Provident Fund Rules</strong>.",
    meta:
      "<p><strong>Currently in effect.</strong> Labour Act 2006 · Sections 23, 26, 27. 2013 Amendment applies.</p><p><strong>Adjacent.</strong> Income Tax on final settlement, Provident Fund Rules, gratuity under s.236.</p><p><strong>Authorities.</strong> DIFE (primary), NBR, Labour Court, Provident Fund Board.</p>",
    primary: { id: "s27", label: "Section 27", meta: "Absence · Loss of lien", amended: true },
    supporting: [
      { id: "s23", label: "Section 23", meta: "Misconduct", amended: true },
      { id: "s26", label: "Section 26", meta: "Notice period" },
      { id: "s236", label: "Section 236", meta: "Gratuity", amended: true },
      { id: "act", label: "Labour Act 2006", meta: "Foundational", isNucleus: true },
    ],
    crossCorpus: [
      { id: "tax-chvii", label: "Income Tax Ch. VII", meta: "Settlement treatment" },
      { id: "pf-rules", label: "Provident Fund Rules", meta: "Benefit clearance" },
    ],
    authorities: [
      { id: "dife", label: "DIFE", sublabel: "Primary inspector" },
      { id: "nbr", label: "NBR", sublabel: "Revenue" },
      { id: "lc", label: "Labour Court", sublabel: "Adjudicatory" },
      { id: "pfb", label: "PF Board", sublabel: "Benefit trustee" },
    ],
  },
  maternity: {
    query: "Maternity leave after the 2025 Ordinance",
    situation:
      "Your query centers on <strong>Section 46 (maternity leave)</strong> and <strong>Section 50 (maternity benefit)</strong>, recently amended by the <strong>2025 Ordinance</strong> extending paid leave to 20 weeks for establishments above 100 workers. The benefit crosses into <strong>Chapter VII of the Income Tax Act 2023</strong> on payroll treatment.",
    meta:
      "<p><strong>Currently in effect.</strong> Labour Act 2006 · Sections 46, 50 · 2025 Ordinance applies (100+ worker establishments).</p><p><strong>Adjacent.</strong> Income Tax on maternity benefit, welfare fund contributions.</p><p><strong>Authorities.</strong> DIFE, Ministry of Labour, NBR.</p>",
    primary: { id: "s46", label: "Section 46", meta: "Maternity leave", amended: true },
    supporting: [
      { id: "s50", label: "Section 50", meta: "Maternity benefit", amended: true },
      { id: "act", label: "Labour Act 2006", meta: "Foundational", isNucleus: true },
      { id: "rules", label: "Labour Rules 2015", meta: "Implementing" },
    ],
    crossCorpus: [
      { id: "tax-payroll", label: "Income Tax · Payroll", meta: "Benefit treatment" },
      { id: "welfare-fund", label: "Welfare Fund Rules", meta: "Contribution basis" },
    ],
    authorities: [
      { id: "dife", label: "DIFE", sublabel: "Inspection" },
      { id: "mol", label: "Ministry of Labour", sublabel: "Policy" },
      { id: "nbr", label: "NBR", sublabel: "Revenue" },
    ],
  },
  safety: {
    query: "A workplace accident",
    situation:
      "Your situation spans the Labour Act 2006 <strong>Chapter VI (safety)</strong>, with notification obligations under <strong>Sections 79 and 89</strong>, and reaches into OSH regulations. For fire-related incidents, separate obligations under the Fire Service Ordinance. Listed companies must disclose material incidents under <strong>BSEC rules</strong>.",
    meta:
      "<p><strong>Currently in effect.</strong> Labour Act 2006 · Sections 79, 80, 89 · Chapter VI · 2018 Amendment tightened timelines.</p><p><strong>Adjacent.</strong> Fire Service Ordinance, Environment Conservation Act, BSEC disclosure.</p><p><strong>Authorities.</strong> DIFE, Fire Service, DoE, BSEC (if listed).</p>",
    primary: { id: "s79", label: "Section 79", meta: "Accident notice", amended: true },
    supporting: [
      { id: "s80", label: "Section 80", meta: "Notice form & particulars" },
      { id: "s89", label: "Section 89", meta: "Inspector reporting" },
      { id: "chvi", label: "Chapter VI", meta: "Safety framework", isNucleus: true },
    ],
    crossCorpus: [
      { id: "fire", label: "Fire Service Ordinance", meta: "Fire-related incidents" },
      { id: "environment", label: "Environment Conservation Act", meta: "Hazardous incidents" },
      { id: "bsec", label: "BSEC disclosure", meta: "Listed company duty" },
    ],
    authorities: [
      { id: "dife", label: "DIFE", sublabel: "Primary inspector" },
      { id: "fire", label: "Fire Service & Civil Defence", sublabel: "Fire incidents" },
      { id: "doe", label: "Department of Environment", sublabel: "Hazardous incidents" },
      { id: "bsec", label: "BSEC", sublabel: "If listed" },
    ],
  },
};

const PRESET_PICKS: { id: keyof typeof COMPOSITIONS; label: string }[] = [
  { id: "termination", label: "Terminating a worker for absence" },
  { id: "maternity", label: "Maternity leave after the 2025 Ordinance" },
  { id: "safety", label: "A workplace accident" },
];

export function SituationContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const [activeId, setActiveId] = useState<keyof typeof COMPOSITIONS>("termination");
  const c = COMPOSITIONS[activeId];

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <section className="lf-rl-wrap">
            <motion.header
              className="lf-rl-hero"
              variants={heroStagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ II.2</span>
                Situation Map
              </motion.div>
              <motion.h1 variants={fadeUp} className="lf-rl-title">
                A situation, mapped <em>across every law that applies.</em>
              </motion.h1>
              <motion.p variants={fadeUp} className="lf-rl-deck">
                Describe a real situation. The map shows how labor, tax, OSH, and governance
                laws apply together. Primary section, related sections, the cross-corpus
                touchpoints, and the authorities involved — laid out clearly.
              </motion.p>

              <motion.div variants={fadeUp} className="lf-rl-chips">
                {PRESET_PICKS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="lf-rl-chip"
                    data-active={p.id === activeId}
                    onClick={() => setActiveId(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="lf-rl-sit-trust">
                <span>
                  <strong>4</strong> areas of law mapped
                </span>
                <span>
                  <strong>8</strong> preset compositions
                </span>
                <span>
                  Reviewed by <strong>Mehnaz Islam</strong>
                </span>
              </motion.div>
            </motion.header>

            <motion.div
              className="lf-rl-sit"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <AnimatePresence mode="wait">
                <motion.article
                  key={activeId}
                  className="lf-rl-sit-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                >
                  <div className="lf-rl-sit-head">
                    <div className="lf-rl-sit-kicker">Composed situation note</div>
                    <h2 className="lf-rl-sit-query">{c.query}</h2>
                  </div>
                  <p
                    className="lf-rl-sit-body"
                    dangerouslySetInnerHTML={{ __html: sanitize(c.situation, inlineSchema) /* M-11 */ }}
                  />
                  <div className="lf-rl-sit-applies">
                    <div className="lf-rl-sit-applies-label">What applies</div>
                    <div
                      className="lf-rl-sit-applies-meta"
                      dangerouslySetInnerHTML={{ __html: sanitize(c.meta, inlineSchema) /* M-11 */ }}
                    />
                  </div>

                  <div className="lf-rl-sit-grid">
                    <div className="lf-rl-sit-col">
                      <div className="lf-rl-sit-col-label">Sections in play</div>
                      <div className="lf-rl-sit-node" data-primary="true">
                        <div>
                          <div className="lf-rl-sit-node-name">{c.primary.label}</div>
                          <div className="lf-rl-sit-node-meta">{c.primary.meta}</div>
                        </div>
                        {c.primary.amended ? (
                          <span className="lf-rl-sit-node-amended">Amended</span>
                        ) : null}
                      </div>
                      {c.supporting.map((n) => (
                        <div
                          key={n.id}
                          className="lf-rl-sit-node"
                          data-nucleus={n.isNucleus || false}
                        >
                          <div>
                            <div className="lf-rl-sit-node-name">{n.label}</div>
                            <div className="lf-rl-sit-node-meta">{n.meta}</div>
                          </div>
                          {n.amended ? (
                            <span className="lf-rl-sit-node-amended">Amended</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <div className="lf-rl-sit-col">
                      <div className="lf-rl-sit-col-label">Cross-corpus</div>
                      {c.crossCorpus.map((n) => (
                        <div key={n.id} className="lf-rl-sit-node">
                          <div>
                            <div className="lf-rl-sit-node-name">{n.label}</div>
                            <div className="lf-rl-sit-node-meta">{n.meta}</div>
                          </div>
                        </div>
                      ))}
                      <div className="lf-rl-sit-col-label" style={{ marginTop: "var(--s-3)" }}>
                        Authorities
                      </div>
                      {c.authorities.map((a) => (
                        <div key={a.id} className="lf-rl-sit-node">
                          <div>
                            <div className="lf-rl-sit-node-name">{a.label}</div>
                            <div className="lf-rl-sit-node-meta">{a.sublabel}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lf-rl-sit-actions">
                    <Link href="/chat" className="lf-rl-sit-action primary">
                      Ask LLP this question →
                    </Link>
                    <Link href="/documents" className="lf-rl-sit-action">
                      Open primary section
                    </Link>
                    <Link href="/services" className="lf-rl-sit-action">
                      Start a Services Desk job
                    </Link>
                  </div>
                  <div className="lf-rl-sit-byline">
                    Preset content authored and reviewed by <strong>Mehnaz Islam</strong>.
                    Cross-section mappings maintained weekly. Last reviewed{" "}
                    <strong>24 April 2026</strong>.
                  </div>
                </motion.article>
              </AnimatePresence>
            </motion.div>

            <div className="lf-rl-foot">
              Open the{" "}
              <Link href="/research/biography" style={{ color: "var(--accent-blue)" }}>
                Section Biography
              </Link>{" "}
              to read any of the sections above in their full amendment + authority context.
            </div>
          </section>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
