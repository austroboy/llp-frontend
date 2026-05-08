"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  ArrowRight,
  Scale,
  Search,
  Users,
  GraduationCap,
  Headset,
  Network,
} from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";

/* ───────────────── Motion ───────────────── */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const inViewOnce = { once: true, margin: "-72px 0px" } as const;

/* ───────────────── Data ───────────────── */

const modules = [
  {
    icon: Search,
    title: "AI Employment Law Search",
    desc: "Search Bangladesh labour law across 8 legal instruments with AI-verified citations.",
    href: "/sign-in",
  },
  {
    icon: Users,
    title: "Expert Network",
    desc: "Connect with verified labour law specialists for consultations and case guidance.",
    href: "/experts",
  },
  {
    icon: Headset,
    title: "Services Desk",
    desc: "Request compliance services — scoped, assigned, tracked, and delivered.",
    href: "/services",
  },
  {
    icon: Network,
    title: "Headhunting Network",
    desc: "Scout-led talent sourcing for Bangladesh employers with cross-border reach.",
    href: "/headhunting",
  },
  {
    icon: GraduationCap,
    title: "Academy",
    desc: "Practical compliance learning and HR certification programmes.",
    href: "/academy",
  },
  {
    icon: Scale,
    title: "Resources",
    desc: "Legal documents, insights, regulatory updates, and research.",
    href: "/blog",
  },
];

const keyFacts = [
  "8 legal instruments indexed — including the Bangladesh Labour Act 2006 (amended 2025), EPZ Labour Act, and OSH Policy",
  "1,206 legal sections searchable with AI-verified citations",
  "Bilingual support — English and Bangla",
  "Bangladesh-based, with cross-border reach into India and the UAE",
];

/* ───────────────── Helpers ───────────────── */

function Kicker({ n, label }: { n: string; label: string }) {
  return (
    <div className="lf-kicker">
      <span className="lf-kicker-mark">§ {n}</span>
      {label}
    </div>
  );
}

/* ───────────────── Sections ───────────────── */

function AboutHero() {
  return (
    <section
      className="lf-section"
      style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
    >
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <Kicker n="01" label="About" />
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="lf-h2"
          style={{ fontSize: "clamp(36px, 4.6vw, 56px)" }}
        >
          About <em>Labor Law Partner</em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ marginTop: 18, maxWidth: "62ch" }}
        >
          Labor Law Partner is a Bangladesh-based legal compliance ecosystem.
          We combine AI-powered employment law search, expert consultancy,
          compliance services, academy training, and structured talent sourcing
          into one connected platform — built to make labour law accessible,
          actionable, and transparent.
        </motion.p>
      </motion.div>
    </section>
  );
}

function AboutMission() {
  return (
    <section className="lf-section">
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp}>
          <Kicker n="02" label="Mission" />
        </motion.div>
        <motion.h2 variants={fadeUp} className="lf-h2">
          Our <em>mission</em>
        </motion.h2>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card lf-card--feature"
        style={{ maxWidth: 880 }}
      >
        <p className="lf-body" style={{ fontSize: 15, lineHeight: 1.7 }}>
          Bangladesh's labour law landscape is complex — spread across multiple
          legal instruments, amended frequently, and often inaccessible to the
          people who need it most. Workers don't know their rights. Employers
          struggle with compliance. HR professionals lack reliable, structured
          guidance.
        </p>
        <p
          className="lf-body"
          style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7 }}
        >
          LLP exists to close that gap. We are building a platform where legal
          questions get cited answers, compliance gets structured support, and
          hiring gets transparent accountability — all in one place.
        </p>
      </motion.div>
    </section>
  );
}

function AboutEcosystem() {
  return (
    <section className="lf-section">
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp}>
          <Kicker n="03" label="Ecosystem" />
        </motion.div>
        <motion.h2 variants={fadeUp} className="lf-h2">
          The <em>LLP ecosystem</em>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ marginTop: 14 }}
        >
          Six connected modules. One platform.
        </motion.p>
      </motion.div>

      <motion.div
        className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        {modules.map(({ icon: Icon, title, desc, href }) => (
          <motion.div key={title} variants={fadeUp}>
            <Link
              href={href}
              className="lf-card lf-card--hover group flex h-full flex-col"
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background:
                    "color-mix(in oklab, var(--accent-blue) 14%, transparent)",
                  color: "var(--accent-blue)",
                  marginBottom: 18,
                  border:
                    "1px solid color-mix(in oklab, var(--accent-blue) 28%, var(--glass-border))",
                }}
              >
                <Icon className="size-5" strokeWidth={1.6} />
              </div>
              <h3 className="lf-h3" style={{ fontSize: 17 }}>
                {title}
              </h3>
              <p
                className="lf-body"
                style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.6 }}
              >
                {desc}
              </p>
              <div
                className="lf-meta lf-meta--accent"
                style={{
                  marginTop: "auto",
                  paddingTop: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Explore
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function AboutKeyFacts() {
  return (
    <section className="lf-section">
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp}>
          <Kicker n="04" label="By the numbers" />
        </motion.div>
        <motion.h2 variants={fadeUp} className="lf-h2">
          Key <em>facts</em>
        </motion.h2>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card lf-card--feature"
        style={{ maxWidth: 880 }}
      >
        <ul className="space-y-4">
          {keyFacts.map((fact, idx) => (
            <li key={fact} className="flex items-start gap-4">
              <span
                className="lf-meta lf-meta--accent shrink-0"
                style={{ paddingTop: 4, fontSize: 10 }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span
                className="lf-body"
                style={{ fontSize: 14.5, lineHeight: 1.65 }}
              >
                {fact}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

function AboutCTA() {
  return (
    <section className="lf-section">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card lf-card--feature"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "clamp(28px, 4vw, 56px)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              radial-gradient(ellipse 60% 50% at 80% 20%, color-mix(in oklab, var(--accent-blue) 22%, transparent) 0%, transparent 60%),
              radial-gradient(ellipse 55% 45% at 10% 90%, color-mix(in oklab, var(--emerald) 16%, transparent) 0%, transparent 55%)
            `,
          }}
        />
        <div className="relative grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <div className="lf-section-eyebrow">
              <span className="lf-section-eyebrow-rule" />
              <span className="lf-meta lf-meta--accent">§ 05</span>
              <span className="lf-meta">Get started</span>
            </div>
            <h2
              className="lf-h2"
              style={{ fontSize: "clamp(32px, 4vw, 48px)" }}
            >
              Get <em>started</em>
            </h2>
            <p
              className="lf-section-deck"
              style={{ marginTop: 14, maxWidth: "58ch" }}
            >
              Explore the platform, connect with experts, or track a service
              request.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/sign-up"
              className="lf-cta lf-cta--primary lf-glow"
              style={{ justifyContent: "center" }}
            >
              <span>Create Free Account</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/services"
              className="lf-cta lf-cta--ghost lf-glow"
              style={{ justifyContent: "center" }}
            >
              <span>View Services</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ───────────────── Main ───────────────── */

export function AboutContent(): ReactNode {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "light";

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />
        <main>
          <AboutHero />
          <AboutMission />
          <AboutEcosystem />
          <AboutKeyFacts />
          <AboutCTA />
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
