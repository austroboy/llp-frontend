"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "motion/react";
import { ArrowRight, Users, Building2, Handshake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { REG_EASE } from "./_shared";

type Path = {
  folio: string;
  href: string;
  audience: string;
  icon: LucideIcon;
  title: string;
  body: string;
  cta: string;
  sealed?: boolean;
};

const paths: Path[] = [
  {
    folio: "i",
    href: "/headhunting/connect",
    audience: "For Employers",
    icon: Building2,
    title: "Commission a search.",
    body: "Share your hiring need. We structure it into a mandate, activate scout-led sourcing, and deliver a screened shortlist — with visibility at every stage.",
    cta: "Request Hiring Support",
    sealed: true,
  },
  {
    folio: "ii",
    href: "/headhunting/scout/join",
    audience: "For Scouts",
    icon: Users,
    title: "Join the scout network.",
    body: "If you have trusted access to talent within a profession, industry, or community — apply to support live mandates and earn per-placement fees.",
    cta: "Apply as Scout",
  },
  {
    folio: "iii",
    href: "/headhunting/collab",
    audience: "For Partners",
    icon: Handshake,
    title: "Collaborate with LLP.",
    body: "For recruitment firms, agencies, and search partners who can support mandate execution through shared infrastructure and coordinated delivery.",
    cta: "Explore Collaboration",
  },
];

function PathCard({ path, index }: { path: Path; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const Icon = path.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.8,
        delay: index * 0.12,
        ease: REG_EASE,
      }}
      className="relative"
    >
      {path.sealed && (
        <span className="reg-seal">
          <span className="reg-diamond" style={{ background: "#f4efdd" }} />
          Recommended
        </span>
      )}

      <Link
        href={path.href}
        className="reg-card-raised group relative block p-8 sm:p-10 lg:p-12 h-full transition-transform duration-500 hover:-translate-y-1"
        style={{
          borderColor: path.sealed ? "var(--reg-emerald)" : undefined,
          boxShadow: path.sealed
            ? "0 1px 0 0 rgba(46, 125, 91, 0.12), 0 18px 36px -16px rgba(46, 125, 91, 0.25), 0 2px 6px -2px rgba(46, 125, 91, 0.18)"
            : undefined,
        }}
      >
        {/* Corner trim */}
        <span className="reg-trim reg-trim--tl" />
        <span className="reg-trim reg-trim--br" />

        {/* Folio + audience */}
        <div className="flex items-center justify-between">
          <span
            className="reg-numeral text-3xl leading-none"
            style={{
              color: path.sealed ? "var(--reg-emerald)" : "var(--reg-ink-faint)",
            }}
          >
            {path.folio}
          </span>
          <span
            className="reg-micro"
            style={{
              color: path.sealed ? "var(--reg-emerald)" : undefined,
            }}
          >
            {path.audience}
          </span>
        </div>

        {/* Icon */}
        <div className="mt-8">
          <Icon
            className="size-5"
            style={{
              color: path.sealed ? "var(--reg-emerald)" : "var(--reg-ink-2)",
            }}
          />
        </div>

        {/* Title */}
        <h3
          className="reg-display mt-5 text-[24px] sm:text-[28px] leading-[1.1] font-normal"
          style={{
            color: path.sealed ? "var(--reg-emerald-deep)" : "var(--reg-ink)",
          }}
        >
          {path.title}
        </h3>

        {/* Body */}
        <p className="reg-prose mt-4 text-[14px] sm:text-[14.5px]">
          {path.body}
        </p>

        {/* Bottom CTA row */}
        <div
          className="mt-8 pt-6 border-t flex items-center justify-between"
          style={{
            borderColor: path.sealed
              ? "var(--reg-emerald-soft)"
              : "var(--reg-rule)",
          }}
        >
          <span
            className="reg-micro"
            style={{
              color: path.sealed ? "var(--reg-emerald)" : "var(--reg-ink)",
              fontSize: "10.5px",
            }}
          >
            {path.cta}
          </span>
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-1"
            style={{
              color: path.sealed ? "var(--reg-emerald)" : "var(--reg-ink)",
            }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

export function ActionCta() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-24 sm:py-32 lg:py-40">
      <div aria-hidden className="reg-grid-sparse absolute inset-0 pointer-events-none" />

      <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <motion.header
          ref={ref}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: REG_EASE }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="reg-marker justify-center">
            <span className="reg-marker-rule" />
            <span className="reg-marker-num">§ IX</span>
            <span>The Appointment</span>
          </div>
          <h2 className="reg-display mt-7 text-[36px] sm:text-[46px] lg:text-[56px] leading-[1.02] font-normal max-w-[22ch] mx-auto">
            Ready to begin the{" "}
            <span className="reg-display-italic" style={{ color: "var(--reg-emerald)" }}>
              hiring conversation?
            </span>
          </h2>
          <p className="reg-prose mt-6 mx-auto max-w-[52ch] text-[15.5px] sm:text-[16px]">
            Whether you need to hire, want to source, or can bring market reach — there&apos;s a structured entry point for each.
          </p>
        </motion.header>

        {/* Three paths */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {paths.map((p, i) => (
            <PathCard key={p.href} path={p} index={i} />
          ))}
        </div>

        {/* Closing mark */}
        <div className="mt-16 sm:mt-20 reg-divider">
          <span className="reg-diamond" />
          <span className="reg-coord">End of Registry · Commission to continue</span>
          <span className="reg-diamond" />
        </div>
      </div>
    </section>
  );
}
