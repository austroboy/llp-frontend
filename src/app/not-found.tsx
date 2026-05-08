"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

function folioDate(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

const SUGGESTIONS: Array<{ href: string; label: string }> = [
  { href: "/chat", label: "Ask LIA" },
  { href: "/headhunting", label: "Headhunting Desk" },
  { href: "/experts", label: "Expert Marketplace" },
  { href: "/blog", label: "Editorial Blog" },
];

export default function NotFound() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
      <MotionConfig reducedMotion="user">
        <SiteTopNav />
        <main>
          <section
            className="lf-section"
            style={{
              paddingTop: "calc(var(--s-7) + 48px)",
              position: "relative",
            }}
          >
            <span
              aria-hidden
              className="lf-not-found-numeral"
              style={{
                position: "absolute",
                top: "calc(var(--s-7) + 24px)",
                right: "var(--s-5)",
                fontFamily: "var(--lf-display)",
                fontWeight: 400,
                fontSize: "clamp(12rem, 26vw, 22rem)",
                lineHeight: 0.82,
                letterSpacing: "-0.04em",
                color: "var(--ink-4)",
                opacity: 0.1,
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 0,
              }}
            >
              404
            </span>

            <div style={{ position: "relative", zIndex: 1 }}>
              <motion.div
                className="lf-section-header"
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={fadeUp} className="lf-kicker">
                  <span className="lf-kicker-mark">§ 404</span>Instrument not
                  found
                </motion.div>
                <motion.h1 variants={fadeUp} className="lf-h2">
                  The page you requested has been <em>mislaid</em>.
                </motion.h1>
                <motion.p variants={fadeUp} className="lf-section-deck">
                  No instrument by that name is on file. It may have been moved
                  to a new folio, archived after supersession, or never issued
                  at all. The front desk can direct you to the current
                  register.
                </motion.p>
              </motion.div>

              <motion.div
                className="lf-card lf-card--feature"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                style={{
                  maxWidth: 820,
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-4)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "var(--s-2)",
                  }}
                >
                  <Link href="/" className="lf-cta lf-cta--primary lf-glow">
                    Return to Front Desk
                  </Link>
                  <Link href="/search" className="lf-cta lf-cta--ghost lf-glow">
                    Search the Registry
                  </Link>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--glass-border)",
                    paddingTop: "var(--s-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--s-2)",
                  }}
                >
                  <div className="lf-meta lf-meta--accent">Likely folios</div>
                  <ul className="lf-runlist">
                    {SUGGESTIONS.map((item, idx) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--s-2)",
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          <span className="lf-runlist-num">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="lf-runlist-text">{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--glass-border)",
                    paddingTop: "var(--s-3)",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--s-2)",
                  }}
                >
                  <span className="lf-meta">
                    Folio · LLP-{folioDate()} / N·A
                  </span>
                  <span className="lf-meta" style={{ color: "var(--ink-4)" }}>
                    Chancery of the Codex
                  </span>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
        <HomepageFooter />
      </MotionConfig>
    </div>
  );
}
