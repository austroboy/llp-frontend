"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";
import "./path-styles.css";

const STAGES = [
  {
    title: "Reading your Twin",
    sub: "Pulling company context, worker count, sector, and role.",
  },
  {
    title: "Selecting your methodology",
    sub: "5S Foundation if you're starting from zero, AGARS Refresh if PF exists.",
  },
  {
    title: "Curating Industry Context",
    sub: "Selecting sector-specific examples and benchmarks.",
  },
  {
    title: "Composing Session 1",
    sub: "Assembling your Applicability Decision Tree, ready to fill in.",
  },
];

const STAGE_DURATION_MS = 1400;

export function PathAssemblyContent() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const [stageIdx, setStageIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stageIdx < STAGES.length) {
      timerRef.current = setTimeout(() => {
        if (stageIdx < STAGES.length - 1) setStageIdx(stageIdx + 1);
        else {
          // small final delay before route
          timerRef.current = setTimeout(() => router.push("/academy/pf"), 700);
        }
      }, STAGE_DURATION_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stageIdx, router]);

  const stage = STAGES[stageIdx];
  const progress = ((stageIdx + 1) / STAGES.length) * 100;

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <div className="lf-as-wrap">
            <div className="lf-as-glyph">
              <span className="lf-as-ring" />
              <span className="lf-as-ring r2" />
              <span className="lf-as-ring r3" />
              <span className="lf-as-core" />
            </div>
            <div className="lf-as-kicker">Assembling your Path</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={stage.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              >
                <h1 className="lf-as-stage">{stage.title}</h1>
                <p className="lf-as-sub">{stage.sub}</p>
              </motion.div>
            </AnimatePresence>
            <div className="lf-as-track">
              <div className="lf-as-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="lf-as-counter">
              <strong>{stageIdx + 1}</strong> of {STAGES.length}
            </div>
          </div>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
