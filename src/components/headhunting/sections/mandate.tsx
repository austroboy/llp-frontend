"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { REG_EASE } from "./_shared";

const taxonomy = [
  {
    folio: "i",
    title: "Must-Haves",
    desc: "What a candidate absolutely needs to enter the pipeline. Without these, no experience or personality matters.",
    variant: "neutral" as const,
  },
  {
    folio: "ii",
    title: "Deal Breakers",
    desc: "What removes a candidate instantly, regardless of strengths. Defined upfront so no one wastes time on interviews that were never viable.",
    variant: "strike" as const,
  },
  {
    folio: "iii",
    title: "Critical Match Points",
    desc: "What separates a good candidate from the right one. The signals that make shortlists genuinely useful.",
    variant: "neutral" as const,
  },
  {
    folio: "iv",
    title: "General Match Factors",
    desc: "Secondary indicators that matter when your top three candidates look equally strong on paper.",
    variant: "neutral" as const,
  },
  {
    folio: "v",
    title: "Role Context",
    desc: "What the org chart won't tell you. Team dynamics, reporting realities, and the environment the person actually walks into.",
    variant: "neutral" as const,
  },
  {
    folio: "vi",
    title: "Challenge Profile",
    desc: "What the role honestly demands day-to-day. The things that determine whether someone stays beyond year one.",
    variant: "neutral" as const,
  },
  {
    folio: "vii",
    title: "Motivation Fit",
    desc: "Why the right person would actually want this role. Not the salary — the pull factors that create real engagement.",
    variant: "neutral" as const,
  },
  {
    folio: "viii",
    title: "Realistic Job Preview",
    desc: "What candidates need to know early so neither side wastes time on misaligned expectations.",
    variant: "neutral" as const,
  },
  {
    folio: "ix",
    title: "Sensitivity Controls",
    desc: "Who sees what, and when. The confidentiality parameters that protect both the company and the candidates throughout the process.",
    variant: "seal" as const,
  },
];

function IndexEntry({ item, index }: { item: (typeof taxonomy)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const strike = item.variant === "strike";
  const seal = item.variant === "seal";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.05,
        ease: REG_EASE,
      }}
      className="reg-card group relative p-7 lg:p-8"
    >
      <div className="flex items-center justify-between">
        <span
          className="reg-numeral text-2xl lowercase"
          style={{ color: seal ? "var(--reg-emerald)" : "var(--reg-ink-faint)" }}
        >
          {item.folio}.
        </span>
        {strike && (
          <span className="reg-coord" style={{ color: "#a84242" }}>
            ⊗ excluded
          </span>
        )}
        {seal && (
          <span className="reg-micro reg-micro-emerald">Sealed</span>
        )}
      </div>

      <h4
        className={`mt-5 text-[18px] sm:text-[19px] font-normal leading-tight reg-display ${
          strike ? "line-through decoration-[1px]" : ""
        }`}
        style={{
          color: seal ? "var(--reg-emerald-deep)" : "var(--reg-ink)",
          textDecorationColor: strike ? "rgba(168, 66, 66, 0.6)" : undefined,
        }}
      >
        {item.title}
      </h4>

      <p className="reg-prose mt-3 text-[14px] leading-relaxed">
        {item.desc}
      </p>

      {/* Bottom rule accent — emerald grow on hover */}
      <div
        aria-hidden
        className="mt-5 h-[2px] w-8 transition-all duration-500 group-hover:w-full"
        style={{
          background: seal ? "var(--reg-emerald)" : "var(--reg-ink-whisper)",
        }}
      />
    </motion.div>
  );
}

export function Mandate() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="reg-section--services-paper relative border-b border-[color:var(--reg-rule)] py-24 sm:py-32 lg:py-40">
      <div aria-hidden className="reg-grid absolute inset-0 pointer-events-none" style={{ opacity: 0.45 }} />

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <motion.header
          ref={ref}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: REG_EASE }}
          className="max-w-3xl"
        >
          <div className="reg-marker">
            <span className="reg-marker-rule" />
            <span className="reg-marker-num">§ III</span>
            <span>The Blueprint</span>
          </div>
          <h2 className="reg-display mt-7 text-[36px] sm:text-[46px] lg:text-[56px] leading-[1.02] font-normal max-w-[22ch]">
            Nine dimensions. Because most briefs{" "}
            <span className="reg-display-italic" style={{ color: "var(--reg-emerald)" }}>
              cover two.
            </span>
          </h2>
          <p className="reg-prose mt-6 max-w-[58ch] text-[15.5px] sm:text-[16px]">
            A typical job description covers two or three of these dimensions. A structured mandate covers all nine — because each one changes who you find and how accurately you find them.
          </p>
        </motion.header>

        {/* Index meta row */}
        <div className="mt-14 mb-4 flex items-center justify-between border-b border-[color:var(--reg-rule)] pb-3">
          <span className="reg-micro">Taxonomy · ix entries</span>
          <span className="reg-coord hidden sm:inline">Every mandate · scored · audited · logged</span>
        </div>

        {/* 9-entry registry */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--reg-rule)] border border-[color:var(--reg-rule)]">
          {taxonomy.map((item, i) => (
            <IndexEntry key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
