"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { REG_EASE } from "./_shared";

const machineLayer = [
  {
    sigil: "α",
    label: "Role Decomposition",
    detail:
      "Turns a raw JD into structured competency layers, context signals, and match criteria — in minutes, not days.",
  },
  {
    sigil: "β",
    label: "Submission Scoring",
    detail:
      "Evaluates every candidate against the mandate across twelve dimensions. Consistent, repeatable, bias-resistant.",
  },
  {
    sigil: "γ",
    label: "Pattern Recognition",
    detail:
      "Identifies where the right candidates are likely to be, based on historical sourcing data across mandates.",
  },
];

const humanLayer = [
  {
    sigil: "I",
    label: "Nuance & Judgment",
    detail:
      "The things AI can't see: whether a career trajectory makes sense, whether a cultural signal is a red flag or a strength.",
  },
  {
    sigil: "II",
    label: "Confidentiality Enforcement",
    detail:
      "Who gets to see what, and when. Sensitivity decisions are never automated. They require judgment and accountability.",
  },
  {
    sigil: "III",
    label: "Stakeholder Communication",
    detail:
      "Turning structured data back into clear, actionable briefings that clients and scouts can actually use.",
  },
];

function Column({
  title,
  eyebrow,
  layer,
  items,
  delay = 0,
  emerald = false,
}: {
  title: string;
  eyebrow: string;
  layer: string;
  items: typeof machineLayer;
  delay?: number;
  emerald?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: REG_EASE }}
      className="relative px-7 sm:px-10 lg:px-14 py-14 lg:py-20"
    >
      {/* Column header */}
      <div className="flex items-center gap-4">
        <span
          className="inline-flex size-10 items-center justify-center border text-[13px] font-normal reg-display"
          style={{
            borderColor: emerald ? "var(--reg-emerald)" : "rgba(230, 227, 213, 0.20)",
            color: emerald ? "var(--reg-emerald)" : "rgba(230, 227, 213, 0.60)",
          }}
        >
          {layer}
        </span>
        <div>
          <p
            className="reg-micro"
            style={{ color: emerald ? "var(--reg-emerald)" : "rgba(230, 227, 213, 0.42)" }}
          >
            {eyebrow}
          </p>
          <h3 className="reg-display mt-1 text-[20px] sm:text-[22px] font-normal text-white/95">
            {title}
          </h3>
        </div>
      </div>

      {/* Items */}
      <ul className="mt-12 space-y-8">
        {items.map((item) => (
          <li key={item.label} className="grid grid-cols-[auto_1fr] gap-5">
            <span
              className="reg-numeral text-[28px] leading-none pt-0.5"
              style={{
                color: emerald ? "var(--reg-emerald)" : "rgba(230, 227, 213, 0.42)",
              }}
            >
              {item.sigil}
            </span>
            <div>
              <h4 className="text-[15px] font-medium text-white/92 tracking-[-0.005em]">
                {item.label}
              </h4>
              <p className="reg-prose mt-2 text-[13.5px]" style={{ color: "rgba(230, 227, 213, 0.62)" }}>
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function Intelligence() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      className="reg-vault relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(63, 182, 132, 0.08) 0%, transparent 60%), var(--reg-vault)",
      }}
    >
      {/* Grain */}
      <div aria-hidden className="reg-grain" style={{ opacity: 0.25 }} />

      {/* Faint grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(230, 227, 213, 0.04) 1px, transparent 1px)",
          backgroundSize: "96px 100%",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 py-24 sm:py-32 lg:py-40">
        <motion.header
          ref={ref}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: REG_EASE }}
          className="max-w-3xl"
        >
          <div className="reg-marker" style={{ color: "rgba(230, 227, 213, 0.62)" }}>
            <span
              className="reg-marker-rule"
              style={{ background: "var(--reg-emerald)" }}
            />
            <span className="reg-marker-num">§ IV</span>
            <span>The Instruments</span>
          </div>
          <h2 className="reg-display mt-7 text-[36px] sm:text-[46px] lg:text-[58px] leading-[1.02] font-normal max-w-[20ch] text-white/95">
            Why we don&apos;t let AI{" "}
            <span className="reg-display-italic" style={{ color: "var(--reg-emerald)" }}>
              make the final call.
            </span>
          </h2>
          <p className="reg-prose mt-6 max-w-[58ch] text-[15.5px] sm:text-[16px]" style={{ color: "rgba(230, 227, 213, 0.70)" }}>
            AI is fast and consistent. Humans are perceptive and accountable. The question isn&apos;t which one is better — it&apos;s which one should handle what. Every step is assigned on purpose.
          </p>
        </motion.header>

        {/* Two-column vault interior */}
        <div
          className="mt-16 sm:mt-20 relative grid grid-cols-1 md:grid-cols-2 border"
          style={{
            borderColor: "rgba(230, 227, 213, 0.10)",
            background: "var(--reg-vault-2)",
          }}
        >
          {/* Center divider */}
          <div
            aria-hidden
            className="hidden md:block absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-px"
            style={{ background: "rgba(230, 227, 213, 0.12)" }}
          />
          {/* Divider diamond */}
          <div
            aria-hidden
            className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2"
            style={{
              background: "var(--reg-emerald)",
              transform: "translate(-50%, -50%) rotate(45deg)",
            }}
          />

          <Column
            layer="M"
            eyebrow="Machine Layer"
            title="Executed by instrument."
            items={machineLayer}
            delay={0}
          />
          <Column
            layer="H"
            eyebrow="Human Layer"
            title="Judged by hand."
            items={humanLayer}
            delay={0.15}
            emerald
          />
        </div>

        {/* Footnote */}
        <div className="mt-10 flex items-start gap-3">
          <span style={{ color: "var(--reg-emerald)" }}>†</span>
          <p className="text-[12px] leading-relaxed max-w-[72ch] reg-prose" style={{ color: "rgba(230, 227, 213, 0.55)" }}>
            Every mandate pairs machine throughput with human judgment. Machine outputs are advisory; humans sign.
          </p>
        </div>
      </div>
    </section>
  );
}
