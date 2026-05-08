"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { REG_EASE } from "./_shared";

const steps = [
  {
    folio: "01",
    stage: "The Belief",
    title: "A job description is not a search brief.",
    description:
      "Most JDs describe a wish list — they rarely capture what the role must actually solve, what the team looks like, or where past hires have failed. We read the JD carefully, but we don't treat it as the finished truth.",
    annotation: "Intake — day one.",
  },
  {
    folio: "02",
    stage: "The Process",
    title: "We build what's missing.",
    description:
      "AI and a human reviewer decompose the role into must-haves, context signals, motivation fit, and sensitivity markers. The result is a structured blueprint, confirmed with you before any scout sees it.",
    annotation: "Decomposition — 24–72h.",
  },
  {
    folio: "03",
    stage: "The Outcome",
    title: "A mandate worth activating.",
    description:
      "Only after the blueprint is confirmed does it become a live mandate, with clear constraints, scoring criteria, and controlled scout routing. The search starts with clarity — not guesswork.",
    annotation: "Activation — signed mandate.",
  },
];

function Entry({ step, index }: { step: (typeof steps)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        ease: REG_EASE,
      }}
      className="relative grid grid-cols-[auto_1fr] gap-6 sm:gap-10 lg:gap-14 py-10 lg:py-14 border-b border-[color:var(--reg-rule)] last:border-b-0"
    >
      {/* Left: giant folio numeral */}
      <div className="relative pt-1">
        <div
          aria-hidden
          className="reg-numeral text-6xl sm:text-[140px] lg:text-[176px] leading-[0.82] text-[color:var(--reg-ink-whisper)]"
        >
          {step.folio}
        </div>
        <div className="mt-3 hidden sm:block">
          <span className="reg-coord">Folio · {step.folio}</span>
        </div>
      </div>

      {/* Right: content */}
      <div className="pt-4 sm:pt-6">
        <div className="flex items-center gap-3">
          <span className="reg-marker-dot" />
          <span className="reg-micro reg-micro-emerald">{step.stage}</span>
        </div>
        <h3 className="reg-display mt-4 text-[28px] sm:text-[34px] lg:text-[42px] leading-[1.08] font-normal max-w-[22ch]">
          {step.title}
        </h3>
        <p className="reg-prose mt-5 max-w-[60ch] text-[15.5px] sm:text-[16px]">
          {step.description}
        </p>
        <p className="mt-6 reg-coord">
          {step.annotation}
        </p>
      </div>
    </motion.article>
  );
}

export function Protocol() {
  const headingRef = useRef<HTMLDivElement>(null);
  const headingInView = useInView(headingRef, { once: true, margin: "-60px" });

  return (
    <section className="relative border-b border-[color:var(--reg-rule)] py-24 sm:py-32 lg:py-40">
      <div aria-hidden className="reg-grid-sparse absolute inset-0 pointer-events-none" />

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <motion.header
          ref={headingRef}
          initial={{ opacity: 0, y: 14 }}
          animate={headingInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: REG_EASE }}
          className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-end"
        >
          <div className="lg:col-span-7 xl:col-span-7">
            <div className="reg-marker">
              <span className="reg-marker-rule" />
              <span className="reg-marker-num">§ II</span>
              <span>The Protocol</span>
            </div>
            <h2 className="reg-display mt-7 text-[36px] sm:text-[46px] lg:text-[56px] leading-[1.02] font-normal max-w-[22ch]">
              Why we don&apos;t start searching
              <br />
              <span className="reg-display-italic" style={{ color: "var(--reg-emerald)" }}>
                on day one.
              </span>
            </h2>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 lg:col-start-8">
            <p className="reg-prose text-[15.5px] sm:text-[16px] max-w-[48ch]">
              Hiring failures begin before the first CV arrives — in the brief that was never properly understood. We fix the brief before we activate the search. The protocol is patient by design.
            </p>
            <div className="mt-6 reg-divider">
              <span className="reg-diamond" />
            </div>
          </div>
        </motion.header>

        {/* Entries */}
        <div className="mt-16 lg:mt-24 border-t border-[color:var(--reg-rule-strong)]">
          {steps.map((step, i) => (
            <Entry key={step.folio} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
