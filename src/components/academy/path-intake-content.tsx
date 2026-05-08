"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";
import "./path-styles.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

type StackedOption = { label: string; hint?: string; value?: string };
type Question =
  | { key: string; prompt: string; sub: string; type: "text"; placeholder?: string }
  | { key: string; prompt: string; sub: string; type: "chips"; options: string[] }
  | { key: string; prompt: string; sub: string; type: "chips-stacked"; options: StackedOption[] };

const QUESTIONS: Question[] = [
  {
    key: "firstName",
    prompt: "What's your first name?",
    sub: "We'll greet you by name in every session.",
    type: "text",
    placeholder: "e.g., Ayesha",
  },
  {
    key: "company",
    prompt: "What's your company name?",
    sub: "We'll personalize every session around this.",
    type: "text",
    placeholder: "e.g., Acme Textiles Ltd",
  },
  {
    key: "sector",
    prompt: "What industry?",
    sub: "Shapes the industry context in your first session.",
    type: "chips",
    options: ["RMG Knit", "RMG Woven", "Leather", "Food & Beverage", "Pharma", "Engineering", "Other"],
  },
  {
    key: "pfStatus",
    prompt: "Where are you with PF today?",
    sub: "This shapes your methodology — 5S Foundation if you are starting from zero, AGARS Refresh if PF exists.",
    type: "chips-stacked",
    options: [
      { label: "No PF in place yet", hint: "Building from zero · 5S Foundation", value: "none" },
      { label: "Starting the process", hint: "Early steps taken · 5S Foundation", value: "starting" },
      { label: "PF exists, need to review", hint: "Pressure-check against compliance · AGARS Refresh", value: "exists" },
      { label: "Just learning, don't work in this yet", hint: "Exploring for future role · 5S Foundation", value: "learning" },
    ],
  },
];

export function PathIntakeContent() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const total = QUESTIONS.length;
  const q = QUESTIONS[step];
  const value = answers[q.key];

  const setAnswer = (k: string, v: string) =>
    setAnswers((p) => ({ ...p, [k]: v }));

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else {
      // Persist intake to session storage so /assembling can pick it up
      try {
        sessionStorage.setItem("lf-path-intake", JSON.stringify(answers));
      } catch {}
      router.push("/academy/assembling");
    }
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const canProceed = !!value && value.trim().length > 0;
  const progress = ((step + 1) / total) * 100;

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <div className="lf-pi-shell">
            <div className="lf-pi-progress">
              <div className="lf-pi-progress-meta">
                <span>
                  Question <strong>{step + 1}</strong> of <strong>{total}</strong>
                </span>
                <span>~60 seconds total</span>
              </div>
              <div className="lf-pi-progress-track">
                <div className="lf-pi-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={q.key} variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}>
                <h1 className="lf-pi-prompt">{q.prompt}</h1>
                <p className="lf-pi-sub">{q.sub}</p>

                {q.type === "text" ? (
                  <input
                    type="text"
                    className="lf-pi-input"
                    placeholder={q.placeholder}
                    value={value || ""}
                    onChange={(e) => setAnswer(q.key, e.target.value)}
                  />
                ) : null}

                {q.type === "chips" ? (
                  <div className="lf-pi-chips">
                    {q.options.map((o) => (
                      <button
                        key={o}
                        type="button"
                        className="lf-pi-chip"
                        data-active={value === o}
                        onClick={() => setAnswer(q.key, o)}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                ) : null}

                {q.type === "chips-stacked" ? (
                  <div className="lf-pi-stacked">
                    {q.options.map((o) => {
                      const v = o.value ?? o.label;
                      return (
                        <button
                          key={o.label}
                          type="button"
                          className="lf-pi-stacked-opt"
                          data-active={value === v}
                          onClick={() => setAnswer(q.key, v)}
                        >
                          <span className="lf-pi-stacked-radio" />
                          <span className="lf-pi-stacked-text">
                            <span className="lf-pi-stacked-label">{o.label}</span>
                            {o.hint ? <span className="lf-pi-stacked-hint">{o.hint}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <div className="lf-pi-nav">
              <button
                type="button"
                className="lf-pi-back"
                onClick={back}
                disabled={step === 0}
                style={{ opacity: step === 0 ? 0 : 1, cursor: step === 0 ? "default" : "pointer" }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="lf-pi-next"
                onClick={next}
                disabled={!canProceed}
              >
                {step === total - 1 ? "Assemble my Path →" : "Next →"}
              </button>
            </div>

            <div className="lf-pi-privacy">
              গোপনীয়তা বজায় রাখা হবে। Your answers shape Path for you. Saved to your account, not shared.
            </div>
          </div>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
