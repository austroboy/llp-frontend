"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Building2, Users, Shield, UserCircle, Handshake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { REG_EASE } from "./_shared";

const interfaces = [
  {
    folio: "i",
    icon: Building2,
    party: "Employer",
    title: "Employer Dashboard",
    desc: "Full mandate visibility, shortlist progression, and review control — without the operational noise that slows decisions.",
    sees: "Mandate · Shortlist · Review",
  },
  {
    folio: "ii",
    icon: Users,
    party: "Scout",
    title: "Scout Workspace",
    desc: "Structured briefs, scoped visibility, and field-informed sourcing. Scouts see exactly what they need to source well — not more.",
    sees: "Brief · Submissions · Feedback",
  },
  {
    folio: "iii",
    icon: Shield,
    party: "LLP",
    title: "Review Layer",
    desc: "Central validation and movement control. No candidate moves forward without review. No transition happens without approval.",
    sees: "Everything · Audited · Logged",
    emerald: true,
  },
  {
    folio: "iv",
    icon: UserCircle,
    party: "Candidate",
    title: "Candidate Portal",
    desc: "Role-linked entry, profile submission, and process clarity. Candidates always know where they stand — nothing ambiguous.",
    sees: "Application · Stage · Outcome",
  },
  {
    folio: "v",
    icon: Handshake,
    party: "Partner",
    title: "Partner Interface",
    desc: "Shared workflow, review access, and coordinated delivery. Partners operate within the same governance framework as everyone else.",
    sees: "Mandate slice · Shared ledger",
  },
];

function InterfaceRow({
  item,
  index,
}: {
  item: {
    folio: string;
    icon: LucideIcon;
    party: string;
    title: string;
    desc: string;
    sees: string;
    emerald?: boolean;
  };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const Icon = item.icon;

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.75,
        delay: index * 0.08,
        ease: REG_EASE,
      }}
      className="group relative grid grid-cols-[auto_1fr_auto] gap-3 sm:gap-10 lg:gap-14 items-start py-9 lg:py-11 border-t border-[color:var(--reg-rule)] first:border-t-0"
    >
      {/* Folio + icon */}
      <div className="flex items-start gap-3 sm:gap-4 sm:min-w-[120px]">
        <span
          className="reg-numeral text-3xl leading-none pt-1"
          style={{
            color: item.emerald ? "var(--reg-emerald)" : "var(--reg-ink-faint)",
          }}
        >
          {item.folio}
        </span>
        <div
          className="inline-flex items-center justify-center size-10 border"
          style={{
            borderColor: item.emerald ? "var(--reg-emerald)" : "var(--reg-rule-strong)",
            color: item.emerald ? "var(--reg-emerald)" : "var(--reg-ink-muted)",
          }}
        >
          <Icon className="size-4" />
        </div>
      </div>

      {/* Title + desc */}
      <div>
        <span
          className="reg-micro"
          style={{ color: item.emerald ? "var(--reg-emerald)" : undefined }}
        >
          {item.party}
        </span>
        <h3 className="reg-display mt-2 text-[22px] sm:text-[26px] lg:text-[30px] leading-tight font-normal">
          {item.title}
        </h3>
        <p className="reg-prose mt-3 max-w-[62ch] text-[14.5px] sm:text-[15px]">
          {item.desc}
        </p>
      </div>

      {/* Sees column (hidden on mobile) */}
      <div className="hidden lg:block min-w-[200px] text-right pt-1">
        <span className="reg-micro" style={{ fontSize: "9.5px" }}>
          Visibility
        </span>
        <p className="mt-2 reg-coord">
          {item.sees}
        </p>
      </div>
    </motion.article>
  );
}

export function Stakeholders() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative border-b border-[color:var(--reg-rule)] py-24 sm:py-32 lg:py-40">
      <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10">
        <motion.header
          ref={ref}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: REG_EASE }}
          className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-end"
        >
          <div className="lg:col-span-7">
            <div className="reg-marker">
              <span className="reg-marker-rule" />
              <span className="reg-marker-num">§ VIII</span>
              <span>The Interfaces</span>
            </div>
            <h2 className="reg-display mt-7 text-[36px] sm:text-[46px] lg:text-[54px] leading-[1.02] font-normal max-w-[24ch]">
              Every role sees a different{" "}
              <span className="reg-display-italic" style={{ color: "var(--reg-emerald)" }}>
                view of the mandate.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="reg-prose max-w-[48ch] text-[15.5px] sm:text-[16px]">
              A scout doesn&apos;t need to see what the employer sees. A candidate doesn&apos;t need to see what LLP sees. Each stakeholder gets the view their function requires — nothing more, nothing less.
            </p>
          </div>
        </motion.header>

        {/* Roll call */}
        <div className="mt-16 lg:mt-20 border-y border-[color:var(--reg-rule-strong)]">
          {interfaces.map((item, i) => (
            <InterfaceRow key={item.party} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
