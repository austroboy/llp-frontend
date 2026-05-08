"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { REG_EASE } from "./_shared";

export function PostShortlist() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="reg-section--card-paper relative border-b border-[color:var(--reg-rule)] py-20 sm:py-28">
      {/* Decorative flourish */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--reg-rule-strong) 20%, var(--reg-emerald) 50%, var(--reg-rule-strong) 80%, transparent)",
        }}
      />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: REG_EASE }}
        className="relative mx-auto max-w-[760px] px-4 sm:px-6 text-center"
      >
        <div className="reg-marker justify-center">
          <span className="reg-marker-rule" />
          <span className="reg-marker-num">Interlude</span>
          <span>Beyond placement</span>
        </div>

        {/* Open-quote flourish */}
        <div
          aria-hidden
          className="mt-8 reg-display text-[72px] leading-none"
          style={{ color: "var(--reg-emerald)", opacity: 0.6 }}
        >
          &ldquo;
        </div>

        <h3 className="reg-display-italic -mt-6 text-[26px] sm:text-[32px] lg:text-[36px] leading-[1.22] font-normal max-w-[32ch] mx-auto">
          A placement isn&apos;t a success until the person is onboarded, verified, and performing.
        </h3>

        <p className="reg-prose mt-7 mx-auto max-w-[52ch] text-[15px] sm:text-[16px]">
          Where relevant, LLP supports onboarding coordination, verification, compliance advisory, and related post-selection processes — because hiring doesn&apos;t end at acceptance.
        </p>

        <div className="mt-10 reg-divider">
          <span className="reg-diamond" />
        </div>
      </motion.div>
    </section>
  );
}
