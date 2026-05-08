"use client";

import { useEffect, useState } from "react";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { AuthSpine } from "@/components/auth/AuthSpine";
import { lfClerkAppearance } from "@/lib/clerk-appearance-lf";
import "@/components/landing/landing.css";
import "@/components/landing/landing-auth.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

function buildDossier(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `DOSSIER № LLP-${y}.${m}.${day} / AUTH-${String(
    Math.floor(d.getTime() / 1000) % 1000
  ).padStart(3, "0")}`;
}

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dossier, setDossier] = useState("DOSSIER № LLP / AUTH-…");

  useEffect(() => {
    setMounted(true);
    setDossier(buildDossier());
  }, []);

  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
      <MotionConfig reducedMotion="user">
        <main className="lf-auth-shell">
          <AuthSpine
            dossier={dossier}
            kicker="§ 1.1 · Returning Researcher"
            title="Back to the Labour Code."
            body="Sign in to pick up your Bangladesh labour-law research. Answers stay bilingual (EN · বাংলা) and cited to the exact section of the Act, Rules, or amendment."
            foot="Bangladesh Labour Act · Rules · Amendments"
          />

          <section className="lf-auth-paper">
            <motion.div
              className="lf-auth-paper-inner lf-auth-paper-inner--sm"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp}>
                <SignIn
                  appearance={lfClerkAppearance}
                  routing="path"
                  path="/sign-in"
                  signUpUrl="/sign-up"
                />
              </motion.div>

              <motion.p className="lf-auth-foot-stamp" variants={fadeUp}>
                <Link href="/" className="lf-auth-link">
                  ← Back to Home
                </Link>
              </motion.p>
            </motion.div>
          </section>
        </main>
      </MotionConfig>
    </div>
  );
}
