"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ParticlesBackground } from "@/components/common/ParticlesBackground";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export interface AuthSpineProps {
  dossier: string;
  kicker: string;
  title: string;
  body: string;
  foot: string;
}

export function AuthSpine({ dossier, kicker, title, body, foot }: AuthSpineProps) {
  return (
    <aside className="lf-auth-spine">
      <ParticlesBackground
        particleColor="#8EB8DE"
        lineColor="#8EB8DE"
        particleCount={35}
      />

      <motion.div
        className="lf-auth-spine-stack"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div className="lf-auth-spine-top" variants={fadeUp}>
          <Link href="/" className="lf-auth-medallion" aria-label="Back to home">
            LLP
          </Link>
          <Link href="/" className="lf-auth-spine-return">
            ← Return
          </Link>
        </motion.div>

        <div className="lf-auth-spine-bottom">
          <motion.span
            className="lf-auth-dossier-vertical"
            suppressHydrationWarning
            variants={fadeUp}
          >
            {dossier}
          </motion.span>

          <div>
            <motion.p className="lf-auth-spine-kicker" variants={fadeUp}>
              {kicker}
            </motion.p>
            <motion.h1 className="lf-auth-spine-headline" variants={fadeUp}>
              {title}
            </motion.h1>
            <motion.p className="lf-auth-spine-body" variants={fadeUp}>
              {body}
            </motion.p>
            <motion.p className="lf-auth-spine-foot" variants={fadeUp}>
              {foot}
            </motion.p>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}

export function AuthSpineBand() {
  return (
    <header className="lf-auth-spine-band">
      <Link href="/" className="lf-auth-medallion" aria-label="Back to home">
        LLP
      </Link>
      <Link href="/" className="lf-auth-spine-return">
        ← Return
      </Link>
    </header>
  );
}
