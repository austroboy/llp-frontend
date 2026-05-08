"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Shield, Eye, Lock, Layers } from "lucide-react";
import { REG_EASE } from "./_shared";
import type { LucideIcon } from "lucide-react";

const principles = [
  {
    folio: "01",
    icon: Shield,
    title: "Sensitivity Classification",
    description:
      "Every mandate is tagged with a sensitivity level at intake. This determines who sees what, when, and at which stage — before any information is released.",
  },
  {
    folio: "02",
    icon: Eye,
    title: "Stage-Gated Disclosure",
    description:
      "Information is revealed progressively. Scouts see role parameters, not company names. Clients see shortlists, not raw submissions. No one sees more than their function requires.",
  },
  {
    folio: "03",
    icon: Lock,
    title: "Access Segmentation",
    description:
      "Scouts, clients, collaborators, and administrators operate within separate visibility boundaries. Access is role-based and enforced by the system — not by policy alone.",
  },
  {
    folio: "04",
    icon: Layers,
    title: "Audit Trail",
    description:
      "Every state transition — from submission to shortlist to placement — is logged with timestamps, actors, and rationale. Nothing happens off the record.",
  },
];

function Principle({
  principle,
  index,
}: {
  principle: { folio: string; icon: LucideIcon; title: string; description: string };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const Icon = principle.icon;

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        ease: REG_EASE,
      }}
      className="grid grid-cols-[auto_1fr] gap-5 sm:gap-8 py-9 first:pt-0 last:pb-0"
      style={{
        borderTop: index > 0 ? "1px solid rgba(230, 227, 213, 0.10)" : "none",
      }}
    >
      {/* Folio numeral + icon */}
      <div className="flex flex-col items-center gap-3 pt-1 w-14 sm:w-20">
        <span
          className="reg-numeral text-3xl sm:text-4xl leading-none"
          style={{ color: "var(--reg-emerald)" }}
        >
          {principle.folio}
        </span>
        <div
          className="inline-flex items-center justify-center size-9 border"
          style={{
            borderColor: "rgba(230, 227, 213, 0.22)",
            color: "rgba(230, 227, 213, 0.75)",
          }}
        >
          <Icon className="size-3.5" />
        </div>
      </div>

      {/* Content */}
      <div className="pt-2">
        <h3 className="reg-display text-[22px] sm:text-[26px] font-normal leading-tight text-white/95">
          {principle.title}
        </h3>
        <p
          className="reg-prose mt-3 max-w-[62ch] text-[14.5px]"
          style={{ color: "rgba(230, 227, 213, 0.72)" }}
        >
          {principle.description}
        </p>
      </div>
    </motion.article>
  );
}

export function Governance() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      className="reg-vault relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(63, 182, 132, 0.09) 0%, transparent 55%), var(--reg-vault)",
      }}
    >
      <div aria-hidden className="reg-grain" />

      {/* Sparse vertical rules — evokes vault shelving */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(230, 227, 213, 0.04) 1px, transparent 1px)",
          backgroundSize: "120px 100%",
        }}
      />

      <div className="relative mx-auto max-w-[920px] px-4 sm:px-6 lg:px-10 py-24 sm:py-32 lg:py-40">
        <motion.header
          ref={ref}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: REG_EASE }}
          className="text-center"
        >
          <div className="reg-marker justify-center" style={{ color: "rgba(230, 227, 213, 0.62)" }}>
            <span
              className="reg-marker-rule"
              style={{ background: "var(--reg-emerald)" }}
            />
            <span className="reg-marker-num">§ VII</span>
            <span>The Vault</span>
          </div>
          <h2 className="reg-display mt-7 text-[36px] sm:text-[46px] lg:text-[54px] leading-[1.02] font-normal max-w-[22ch] mx-auto text-white/95">
            Confidentiality can&apos;t be a promise.{" "}
            <span className="reg-display-italic" style={{ color: "var(--reg-emerald)" }}>
              It has to be a system.
            </span>
          </h2>
          <p
            className="reg-prose mt-6 mx-auto max-w-[54ch] text-[15.5px]"
            style={{ color: "rgba(230, 227, 213, 0.70)" }}
          >
            Every firm promises discretion. Few build it into their infrastructure. We treat confidentiality as an engineering problem, not a handshake.
          </p>
          <div className="mt-8 reg-divider" style={{ color: "rgba(230, 227, 213, 0.30)" }}>
            <span className="reg-diamond" style={{ background: "var(--reg-emerald)" }} />
          </div>
        </motion.header>

        {/* Principles */}
        <div className="mt-16">
          {principles.map((p, i) => (
            <Principle key={p.title} principle={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
