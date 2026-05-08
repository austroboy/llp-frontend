"use client";

import { useEffect, useMemo, useState } from "react";
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

function folioHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
}

function folioDate(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const serial = useMemo(() => {
    const seed = error.digest || error.message || "unknown";
    return `Folio · LLP-${folioDate()} / ERR-${folioHash(seed)}`;
  }, [error]);

  return (
    <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
      <MotionConfig reducedMotion="user">
        <SiteTopNav />
        <main>
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
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ E.01</span>An incident in
                transit
              </motion.div>
              <motion.h1 variants={fadeUp} className="lf-h2">
                The request was <em>detained</em> in transit.
              </motion.h1>
              <motion.p variants={fadeUp} className="lf-section-deck">
                A registrar stopped this dispatch before it reached you. The
                incident has been filed and the clerks have been notified. You
                may retry the route — most transient failures clear on a second
                pass — or return to the front desk and request a fresh
                instrument.
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
                <button
                  type="button"
                  onClick={reset}
                  className="lf-cta lf-cta--ghost lf-glow"
                >
                  Retry Dispatch
                </button>
              </div>

              {process.env.NODE_ENV === "development" && error.message ? (
                <div
                  style={{
                    borderTop: "1px solid var(--glass-border)",
                    paddingTop: "var(--s-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--s-2)",
                  }}
                >
                  <div className="lf-meta lf-meta--accent">
                    Developer Notice
                  </div>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: 12,
                      lineHeight: 1.6,
                      fontFamily: "var(--lf-mono)",
                      color: "var(--ink-3)",
                      margin: 0,
                    }}
                  >
                    {error.message}
                  </pre>
                </div>
              ) : null}

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
                <span className="lf-meta">{serial}</span>
                <span className="lf-meta" style={{ color: "var(--ink-4)" }}>
                  Chancery of the Codex
                </span>
              </div>
            </motion.div>
          </section>
        </main>
        <HomepageFooter />
      </MotionConfig>
    </div>
  );
}
