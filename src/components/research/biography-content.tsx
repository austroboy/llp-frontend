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

type Tier = "primary" | "secondary" | "tertiary";
type PressureCls = "pressure-high" | "pressure-mid" | "pressure-low";

type SpineItem = {
  year: string;
  type: string;
  title: string;
  gloss: string;
  instrument: string;
  kind?: "current" | "adjacent" | "normal";
};
type OrbitItem = { name: string; role: string; cls: PressureCls };
type Bio = {
  meta: string;
  title: string;
  titleAccent: string;
  row: { label: string; value: string }[];
  disciplines: { label: string; tier: Tier }[];
  spine: SpineItem[];
  orbitLeft: OrbitItem[];
  orbitRight: OrbitItem[];
  observation: string;
};

const BIOGRAPHIES: Record<string, Bio> = {
  s26: {
    meta: "§ Bangladesh Labour Act 2006",
    title: "Section 26 · ",
    titleAccent: "Notice and termination simpliciter",
    row: [
      { label: "First enacted", value: "2006" },
      { label: "Amendments", value: "3" },
      { label: "Current", value: "Oct 2018" },
    ],
    disciplines: [
      { label: "HR · Primary discipline", tier: "primary" },
      { label: "Compliance", tier: "secondary" },
      { label: "Finance (adjacent)", tier: "tertiary" },
    ],
    spine: [
      {
        year: "2006",
        type: "Enactment",
        title: "Labour Act 2006 consolidates notice and termination.",
        gloss: "First comprehensive framework. 120-day notice for monthly-rated workers.",
        instrument: "Act XLII of 2006 · Section 26",
      },
      {
        year: "2013",
        type: "Procedural",
        title: "Show-cause procedure formalised.",
        gloss: "Written notice to last known address, ten-day response window.",
        instrument: "Amendment Act 2013",
      },
      {
        year: "2018",
        type: "Calculation basis · Current",
        title: "Gratuity on last-drawn wage.",
        gloss: "Resolved a decade of dispute. 2018 Amendment settles on last-drawn wage.",
        instrument: "Amendment Act 2018 · Section 7",
        kind: "current",
      },
      {
        year: "2025",
        type: "Adjacent only",
        title: "2025 Ordinance. Section 26 unchanged.",
        gloss: "Maternity leave extended. Termination provisions untouched.",
        instrument: "Amendment Ordinance 2025",
        kind: "adjacent",
      },
      {
        year: "Today",
        type: "Current state",
        title: "Operative language is the 2018 formulation.",
        gloss: "No amendments pending. Pair with Section 27 and Section 23 for the full picture.",
        instrument: "As at 24 April 2026",
      },
    ],
    orbitLeft: [
      { name: "DIFE", role: "Inspection · Enforcement", cls: "pressure-high" },
      { name: "Labour Court", role: "Adjudicatory", cls: "pressure-high" },
      { name: "Ministry of Labour", role: "Policy · Rule-making", cls: "pressure-mid" },
      { name: "Collective Bargaining Agents", role: "Worker representation", cls: "pressure-mid" },
      { name: "ILO Country Office", role: "Norm-setting · Advisory", cls: "pressure-low" },
    ],
    orbitRight: [
      { name: "RMG establishments", role: "Largest operational exposure", cls: "pressure-high" },
      { name: "Employer Federation BEF", role: "Policy advocacy", cls: "pressure-mid" },
      { name: "BGMEA · BKMEA", role: "Sector bodies", cls: "pressure-mid" },
      { name: "Buyer compliance audits", role: "Indirect commercial pressure", cls: "pressure-low" },
    ],
    observation:
      "Section 26 has been relatively stable since its <strong>2018 calculation-basis amendment</strong>, with the 2022 Rules and 2025 Ordinance leaving it untouched. Pressure comes primarily from the <strong>RMG sector and DIFE enforcement</strong>, with Labour Court case law quietly shaping interpretation year over year. Researchers should pair this section with Section 23 (misconduct) and Section 27 (absence) for the full termination picture.",
  },
  s46: {
    meta: "§ Bangladesh Labour Act 2006",
    title: "Section 46 · ",
    titleAccent: "Maternity leave",
    row: [
      { label: "First enacted", value: "2006" },
      { label: "Amendments", value: "2" },
      { label: "Current", value: "Jan 2025" },
    ],
    disciplines: [
      { label: "HR · Primary discipline", tier: "primary" },
      { label: "Compliance", tier: "secondary" },
      { label: "Finance (adjacent)", tier: "tertiary" },
    ],
    spine: [
      {
        year: "2006",
        type: "Enactment",
        title: "Maternity leave at 16 weeks.",
        gloss: "Paid leave for women with six months of service.",
        instrument: "Act XLII of 2006 · Section 46",
      },
      {
        year: "2018",
        type: "Calculation basis",
        title: "Benefit calculation refined.",
        gloss: "Average daily wage of three months preceding leave.",
        instrument: "Amendment Act 2018 · Section 50",
      },
      {
        year: "2025",
        type: "Rights expansion · Current",
        title: "Leave extended to 20 weeks.",
        gloss: "For establishments above 100 workers. Applies after 1 January 2025.",
        instrument: "Amendment Ordinance 2025 · Section 3",
        kind: "current",
      },
    ],
    orbitLeft: [
      { name: "DIFE", role: "Inspection · Enforcement", cls: "pressure-high" },
      { name: "Ministry of Labour", role: "Policy · Rule-making", cls: "pressure-high" },
      { name: "NBR", role: "Payroll tax oversight", cls: "pressure-mid" },
      { name: "ILO Country Office", role: "Norm-setting · Advisory", cls: "pressure-mid" },
    ],
    orbitRight: [
      { name: "RMG establishments", role: "100+ worker exposure", cls: "pressure-high" },
      { name: "Women workers' groups", role: "Advocacy · Rights", cls: "pressure-high" },
      { name: "Employer Federation BEF", role: "Policy advocacy", cls: "pressure-mid" },
      { name: "Buyer compliance audits", role: "ESG and social compliance", cls: "pressure-mid" },
    ],
    observation:
      "Section 46 has just been <strong>amended by the 2025 Ordinance</strong>, extending paid leave from 16 to 20 weeks for establishments above 100 workers. The interaction with payroll tax treatment under Chapter VII of the Income Tax Act is <strong>currently under editorial review</strong>. Researchers should pair this section with Section 50 (benefit calculation) and watch for NBR circulars on tax treatment of the extended benefit.",
  },
  s79: {
    meta: "§ Bangladesh Labour Act 2006 · Chapter VI",
    title: "Section 79 · ",
    titleAccent: "Notice of accidents",
    row: [
      { label: "First enacted", value: "2006" },
      { label: "Amendments", value: "2" },
      { label: "Current", value: "Sep 2018" },
    ],
    disciplines: [
      { label: "Safety · Primary discipline", tier: "primary" },
      { label: "Compliance", tier: "secondary" },
      { label: "Operations (adjacent)", tier: "tertiary" },
    ],
    spine: [
      {
        year: "2006",
        type: "Enactment",
        title: "Chapter VI consolidates safety and notification.",
        gloss:
          "Notification regime for accidents causing death, serious injury, or disablement.",
        instrument: "Act XLII of 2006 · Section 79",
      },
      {
        year: "2013",
        type: "Penalty",
        title: "Non-notification penalties revised.",
        gloss: "Fines revised upward post-Rana Plaza. Obligation made non-delegable.",
        instrument: "Amendment Act 2013",
      },
      {
        year: "2018",
        type: "Procedural · Current",
        title: "Reporting timelines tightened.",
        gloss:
          "Initial notification within 24 hours for fatal incidents. Written report within 7 days.",
        instrument: "Amendment Act 2018 · Section 12",
        kind: "current",
      },
    ],
    orbitLeft: [
      { name: "DIFE", role: "Primary inspector", cls: "pressure-high" },
      { name: "Fire Service and Civil Defence", role: "Fire incidents", cls: "pressure-high" },
      { name: "Department of Environment", role: "Hazardous incidents", cls: "pressure-mid" },
      { name: "Labour Court", role: "Adjudicatory (if litigated)", cls: "pressure-mid" },
    ],
    orbitRight: [
      { name: "RMG establishments", role: "Post-Rana Plaza exposure", cls: "pressure-high" },
      { name: "Factory associations", role: "Industry response", cls: "pressure-high" },
      { name: "Buyer compliance audits", role: "Accord and Alliance pressure", cls: "pressure-high" },
      { name: "Insurance sector", role: "Claims and risk", cls: "pressure-mid" },
    ],
    observation:
      "Section 79 sits at the center of post-Rana Plaza safety governance. Pressure comes from <strong>DIFE enforcement and buyer audits</strong>, with the <strong>2018 amendment</strong> tightening notification timelines after a decade of under-reporting concerns. Researchers should pair this section with Section 89 (inspector reporting) and Chapter VI more broadly, and note that fire-specific incidents also trigger obligations under the Fire Service and Civil Defence Ordinance.",
  },
};

const SECTION_PICKS: { id: keyof typeof BIOGRAPHIES; label: string }[] = [
  { id: "s26", label: "Section 26 · Termination" },
  { id: "s46", label: "Section 46 · Maternity leave" },
  { id: "s79", label: "Section 79 · Workplace accident" },
];

export function BiographyContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const [activeId, setActiveId] = useState<keyof typeof BIOGRAPHIES>("s26");
  const bio = BIOGRAPHIES[activeId];

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
                <span className="lf-kicker-mark">§ II.1</span>
                Section Biography
              </motion.div>
              <motion.h1 variants={fadeUp} className="lf-rl-title">
                A section, read in <em>full context.</em>
              </motion.h1>
              <motion.p variants={fadeUp} className="lf-rl-deck">
                Every statute has a history, a regulatory context, and a discipline ownership.
                Type a section. The lab renders all three as a living diagram.
              </motion.p>

              <motion.div variants={fadeUp} className="lf-rl-insights">
                <div className="lf-rl-insight">
                  <span className="lf-rl-insight-label">Corpus depth</span>
                  <h3 className="lf-rl-insight-stat">
                    354<span className="unit">sections indexed</span>
                  </h3>
                  <p className="lf-rl-insight-desc">
                    The Labour Act 2006 plus Labour Rules 2015. Amendment trail from enactment
                    through the <strong>2025 Ordinance</strong> tracked per section.
                  </p>
                </div>
                <div className="lf-rl-insight">
                  <span className="lf-rl-insight-label">Interactive detail</span>
                  <h3 className="lf-rl-insight-stat">
                    4<span className="unit">detail views per section</span>
                  </h3>
                  <p className="lf-rl-insight-desc">
                    Click an amendment for context. A regulatory body for what they enforce. A
                    team label to see who owns it.
                  </p>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="lf-rl-chips">
                {SECTION_PICKS.map((p) => (
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
            </motion.header>

            <motion.div
              className="lf-rl-bio"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                >
                  <div className="lf-rl-bio-head">
                    <div className="lf-rl-bio-meta">{bio.meta}</div>
                    <h2 className="lf-rl-bio-title">
                      {bio.title}
                      <em>{bio.titleAccent}</em>
                    </h2>
                    <div className="lf-rl-bio-row">
                      {bio.row.map((r) => (
                        <div key={r.label} className="lf-rl-bio-row-item">
                          <span className="lf-rl-bio-row-label">{r.label}</span>
                          <span className="lf-rl-bio-row-value">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lf-rl-bio-disc">
                    {bio.disciplines.map((d) => (
                      <span key={d.label} className="lf-rl-bio-disc-chip" data-tier={d.tier}>
                        {d.label}
                      </span>
                    ))}
                  </div>

                  <div className="lf-rl-bio-body">
                    <div className="lf-rl-spine">
                      <div className="lf-rl-spine-label">Amendment spine</div>
                      {bio.spine.map((s, i) => (
                        <div key={i} className="lf-rl-spine-item" data-kind={s.kind || "normal"}>
                          <div className="lf-rl-spine-year">{s.year}</div>
                          <div>
                            <div className="lf-rl-spine-type">{s.type}</div>
                            <div className="lf-rl-spine-title">{s.title}</div>
                            <p className="lf-rl-spine-gloss">{s.gloss}</p>
                            <div className="lf-rl-spine-instrument">{s.instrument}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="lf-rl-bio-divider" aria-hidden="true" />
                    <div className="lf-rl-orbit">
                      <div>
                        <div className="lf-rl-orbit-col-label">Bodies that govern</div>
                        <div className="lf-rl-orbit-list">
                          {bio.orbitLeft.map((o) => (
                            <div
                              key={o.name}
                              className="lf-rl-orbit-item"
                              data-pressure-cls={o.cls}
                            >
                              <div>
                                <div className="lf-rl-orbit-name">{o.name}</div>
                                <div className="lf-rl-orbit-role">{o.role}</div>
                              </div>
                              <div className="lf-rl-orbit-pressure" aria-hidden="true">
                                <span /><span /><span /><span />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="lf-rl-orbit-col-label">Who carries the load</div>
                        <div className="lf-rl-orbit-list">
                          {bio.orbitRight.map((o) => (
                            <div
                              key={o.name}
                              className="lf-rl-orbit-item"
                              data-pressure-cls={o.cls}
                            >
                              <div>
                                <div className="lf-rl-orbit-name">{o.name}</div>
                                <div className="lf-rl-orbit-role">{o.role}</div>
                              </div>
                              <div className="lf-rl-orbit-pressure" aria-hidden="true">
                                <span /><span /><span /><span />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lf-rl-bio-obs">
                    <div className="lf-rl-bio-obs-icon">AI</div>
                    <p
                      className="lf-rl-bio-obs-body"
                      dangerouslySetInnerHTML={{ __html: sanitize(bio.observation, inlineSchema) /* M-11 */ }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <div className="lf-rl-foot">
              Authored and reviewed by <strong>Mehnaz Islam</strong>. Open the{" "}
              <Link href="/research/situation" style={{ color: "var(--accent-blue)" }}>
                Situation Map
              </Link>{" "}
              to see how a section connects across labor, tax, OSH, and governance.
            </div>
          </section>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
