"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { ArrowRight, Mail, Building2, Users, Handshake } from "lucide-react";
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

const channels = [
  {
    icon: Mail,
    title: "General enquiries",
    desc: "Questions about the platform, pricing, or getting started.",
    action: "support@laborlawpartner.com",
    href: "mailto:support@laborlawpartner.com",
  },
  {
    icon: Building2,
    title: "Hiring support",
    desc: "Connect with LLP for scout-led talent sourcing and structured hiring.",
    action: "Request Hiring Support",
    href: "/headhunting/connect",
  },
  {
    icon: Users,
    title: "Expert network",
    desc: "Interested in joining the LLP expert network or booking a consultation.",
    action: "Browse Experts",
    href: "/experts",
  },
  {
    icon: Handshake,
    title: "Partnerships",
    desc: "Recruitment agencies, search firms, and organisations interested in collaboration.",
    action: "Explore Collaboration",
    href: "/headhunting/collab",
  },
];

/* ───────────────── Sections ───────────────── */

function ContactHero() {
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
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ 01</span>
            Contact
          </div>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="lf-h2"
          style={{ fontSize: "clamp(36px, 4.6vw, 56px)" }}
        >
          Contact <em>us</em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ marginTop: 18, maxWidth: "58ch" }}
        >
          Reach out through the most relevant channel below. We respond to enquiries within one business day.
        </motion.p>
      </motion.div>
    </section>
  );
}

function ContactChannels() {
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
          <div className="lf-kicker">
            <span className="lf-kicker-mark">§ 02</span>
            Channels
          </div>
        </motion.div>
        <motion.h2 variants={fadeUp} className="lf-h2">
          How can we <em>help</em>?
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ marginTop: 14, maxWidth: "58ch" }}
        >
          Pick the channel that best matches your enquiry — we route every message to the right team.
        </motion.p>
      </motion.div>

      <motion.div
        className="grid gap-5 grid-cols-1 sm:grid-cols-2 items-stretch"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        {channels.map(({ icon: Icon, title, desc, action, href }, idx) => (
          <motion.article
            key={title}
            variants={fadeUp}
            className="lf-card lf-card--hover flex flex-col"
            style={{ padding: 28 }}
          >
            <div
              className="flex items-start justify-between"
              style={{ marginBottom: 18 }}
            >
              <span className="lf-meta lf-meta--accent">
                N° {String(idx + 1).padStart(2, "0")}
              </span>
              <span
                aria-hidden
                className="inline-flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background:
                    "color-mix(in oklab, var(--accent-blue) 12%, var(--glass-bg))",
                  border:
                    "1px solid color-mix(in oklab, var(--accent-blue) 24%, var(--glass-border))",
                  color: "var(--accent-blue)",
                }}
              >
                <Icon className="size-4" strokeWidth={1.6} />
              </span>
            </div>

            <h3 className="lf-h3" style={{ fontSize: 20 }}>
              {title}
            </h3>
            <p
              className="lf-body"
              style={{
                marginTop: 8,
                fontSize: 13.5,
                lineHeight: 1.55,
                flex: 1,
              }}
            >
              {desc}
            </p>

            <div style={{ marginTop: 20 }}>
              {href.startsWith("mailto:") ? (
                <a href={href} className="lf-cta lf-cta--ghost lf-glow">
                  <Mail className="size-3.5" />
                  <span>{action}</span>
                </a>
              ) : (
                <Link href={href} className="lf-cta lf-cta--ghost lf-glow group">
                  <span>{action}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

function ContactDirect() {
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
              <span className="lf-meta lf-meta--accent">§ 03</span>
              <span className="lf-meta">Direct line</span>
            </div>
            <h2
              className="lf-h2"
              style={{ fontSize: "clamp(32px, 4vw, 48px)" }}
            >
              Email us <em>directly</em>
            </h2>
            <p
              className="lf-section-deck"
              style={{ marginTop: 14, maxWidth: "58ch" }}
            >
              For any enquiry not covered above, reach us at the address below — replies within one business day.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="mailto:support@laborlawpartner.com"
              className="lf-cta lf-cta--primary lf-glow"
              style={{ justifyContent: "center" }}
            >
              <Mail className="size-3.5" />
              <span>support@laborlawpartner.com</span>
            </a>
            <Link
              href="/experts"
              className="lf-cta lf-cta--ghost lf-glow"
              style={{ justifyContent: "center" }}
            >
              <span>Browse experts instead</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ───────────────── Main ───────────────── */

export function ContactContent(): ReactNode {
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
          <ContactHero />
          <ContactChannels />
          <ContactDirect />
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
