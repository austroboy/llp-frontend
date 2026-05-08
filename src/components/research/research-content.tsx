"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";
import "./research-styles.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

export function ResearchContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <section className="lf-rl-wrap">
            <motion.header
              className="lf-rl-hero"
              variants={heroStagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ II</span>
                Research Lab
              </motion.div>
              <motion.h1 variants={fadeUp} className="lf-rl-title">
                Two tools for <em>understanding the law.</em>
              </motion.h1>
              <motion.p variants={fadeUp} className="lf-rl-deck">
                Two tools for working with the law in detail. One opens a single section as a
                timeline of amendments and the bodies that shape it. The other connects four
                areas of law — labor, tax, OSH, governance — to show what applies to a real
                situation and who governs it.
              </motion.p>
            </motion.header>

            <motion.div
              className="lf-rl-tools"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp}>
                <Link href="/research/biography" className="lf-rl-tool">
                  <div className="lf-rl-tool-kicker">Tool 01 · Section Biography</div>
                  <h2 className="lf-rl-tool-title">
                    One section, read in <em>full context.</em>
                  </h2>
                  <p className="lf-rl-tool-desc">
                    Year enacted. Three to four amendments. Five bodies that shape the section.
                    The team that owns it. Click anything to read more.
                  </p>
                  <span className="lf-rl-tool-anchor">Open · 354 sections indexed</span>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Link href="/research/situation" className="lf-rl-tool">
                  <div className="lf-rl-tool-kicker">Tool 02 · Situation Map</div>
                  <h2 className="lf-rl-tool-title">
                    A situation, mapped <em>across all four areas.</em>
                  </h2>
                  <p className="lf-rl-tool-desc">
                    Describe a real situation. The system shows how labor, tax, OSH, and
                    governance laws apply together. Primary sections, related sections, the
                    authorities involved, laid out clearly.
                  </p>
                  <span className="lf-rl-tool-anchor">Open · 8 preset compositions</span>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              className="lf-rl-foot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.5, delay: 0.3 } }}
            >
              Press <kbd>⌘</kbd>
              <kbd>K</kbd> to search directly. Research Lab content authored and reviewed by{" "}
              <strong>Mehnaz Islam</strong>. Content v2026.04.24.
            </motion.div>
          </section>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
