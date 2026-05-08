"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";
import "./audit-styles.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

type ChipOption = string;
type StackedOption = { label: string; hint?: string; value?: string };
type Question =
  | { section: string; key: string; prompt: string; sub: string; type: "text"; placeholder?: string }
  | { section: string; key: string; prompt: string; sub: string; type: "chips"; options: ChipOption[] }
  | { section: string; key: string; prompt: string; sub: string; type: "chips-stacked"; options: StackedOption[] };

const QUESTIONS: Question[] = [
  { section: "About your organization", key: "company", prompt: "Your factory or company name", sub: "We'll put this on your report.", type: "text", placeholder: "e.g., Acme Textiles Ltd" },
  { section: "About your organization", key: "workers", prompt: "Permanent worker headcount", sub: "Rough number is fine.", type: "chips", options: ["Under 100", "100 to 500", "500 to 1,000", "1,000 to 2,000", "2,000+"] },
  { section: "About your organization", key: "sector", prompt: "Industry", sub: "Different sectors face different audit intensities.", type: "chips", options: ["RMG Knit", "RMG Woven", "Leather", "Food & Beverage", "Pharma", "Engineering", "Other"] },
  { section: "About your organization", key: "role", prompt: "Your role", sub: "Shapes how we frame the results.", type: "chips", options: ["HR Officer", "HR Manager", "Admin / Compliance", "Director / CEO", "Consultant"] },
  {
    section: "Your PF situation",
    key: "pfStatus",
    prompt: "Current PF position",
    sub: "Honest answer. This is the anchor for everything else.",
    type: "chips-stacked",
    options: [
      { label: "No PF in place yet", hint: "Starting from zero", value: "none" },
      { label: "PF exists but informal", hint: "Not properly registered", value: "informal" },
      { label: "Registered but not NBR recognized", hint: "Missing tax-recognition layer", value: "registered-only" },
      { label: "Compliant, need a review", hint: "Due-diligence check", value: "compliant" },
    ],
  },
  {
    section: "Your PF situation",
    key: "timeline",
    prompt: "What's driving this check?",
    sub: "Calibrates urgency.",
    type: "chips-stacked",
    options: [
      { label: "Buyer audit coming up", hint: "Common driver", value: "buyer" },
      { label: "Worker demand or union pressure", hint: "Section 264 trigger", value: "worker" },
      { label: "Leadership asked for a review", hint: "Internal initiative", value: "internal" },
      { label: "Just checking", hint: "No deadline", value: "none" },
    ],
  },
  {
    section: "Governance reality check",
    key: "contributionMode",
    prompt: "How do PF contributions flow?",
    sub: "Cash vs. banked. This matters more than people realize.",
    type: "chips-stacked",
    options: [
      { label: "Through payroll, direct bank transfer", hint: "Audit-safe pattern", value: "banked" },
      { label: "Separate PF bank account, monthly", hint: "Standard compliant approach", value: "segregated" },
      { label: "Partially cash, partially banked", hint: "Common but risky", value: "mixed" },
      { label: "Cash or informal", hint: "High audit risk", value: "cash" },
      { label: "Not applicable yet", hint: "If you don't have PF", value: "na" },
    ],
  },
  {
    section: "Governance reality check",
    key: "trusteeCadence",
    prompt: "When did your Board of Trustees last meet?",
    sub: "If you have a PF. Skip if not applicable.",
    type: "chips-stacked",
    options: [
      { label: "Within the last 3 months", hint: "Active governance", value: "current" },
      { label: "3 to 12 months ago", hint: "Acceptable but watch cadence", value: "lagging" },
      { label: "Over 12 months ago", hint: "Governance red flag", value: "stale" },
      { label: "Meetings happen but aren't minuted", hint: "Documentation risk", value: "unminuted" },
      { label: "No trustees / No PF yet", hint: "", value: "na" },
    ],
  },
  {
    section: "Governance reality check",
    key: "workerAwareness",
    prompt: "Do workers receive PF balance statements?",
    sub: "Buyer audits check this by interviewing workers.",
    type: "chips-stacked",
    options: [
      { label: "Annual written statement to every member", hint: "Audit-ready", value: "annual" },
      { label: "On request only", hint: "Partial risk", value: "on-request" },
      { label: "Verbal or no statements", hint: "Buyer-audit failure pattern", value: "none" },
      { label: "No PF yet", hint: "", value: "na" },
    ],
  },
  {
    section: "Governance reality check",
    key: "docCurrency",
    prompt: "When was your Fund documentation last updated?",
    sub: "Trust deed, SOP, registers. Ordinance 65/2025 changed some provisions.",
    type: "chips-stacked",
    options: [
      { label: "Within the last year", hint: "Current", value: "current" },
      { label: "1 to 3 years ago", hint: "Review recommended", value: "moderate" },
      { label: "Over 3 years ago", hint: "Pre-dates Ordinance 65/2025", value: "stale" },
      { label: "Never updated / No PF yet", hint: "", value: "na" },
    ],
  },
];

type Answers = Record<string, string>;

type RedFlag = { name: string; desc: string; anchor: string };
type ActionItem = { when: string; text: string };
type Result = {
  score: number;
  zone: "red" | "amber" | "green";
  title: string;
  deck: string;
  flags: RedFlag[];
  actions: ActionItem[];
};

function score(a: Answers): Result {
  let score = 100;
  const flags: RedFlag[] = [];

  if (a.pfStatus === "none") {
    score -= 40;
    flags.push({
      name: "No PF in place",
      desc: "Section 264 makes a Provident Fund mandatory for establishments above the threshold. Starting from zero requires a structured 90-day setup.",
      anchor: "Section 264",
    });
  }
  if (a.pfStatus === "informal") {
    score -= 30;
    flags.push({
      name: "Informal PF without registration",
      desc: "An unregistered PF cannot claim NBR tax recognition and exposes the company to disputes on benefit entitlement.",
      anchor: "Chapter XIII",
    });
  }
  if (a.pfStatus === "registered-only") {
    score -= 18;
    flags.push({
      name: "Missing NBR tax recognition",
      desc: "Without recognition under Sixth Schedule Part B, employer contributions lose their tax-exempt status.",
      anchor: "Income Tax Act 2023",
    });
  }
  if (a.contributionMode === "cash") {
    score -= 25;
    flags.push({
      name: "Cash-mode contribution",
      desc: "Buyer audits flag any cash component immediately. The traceability of PF inflow is the single biggest scorecard line item.",
      anchor: "DIFE checklist",
    });
  } else if (a.contributionMode === "mixed") {
    score -= 12;
    flags.push({
      name: "Partially cash contribution",
      desc: "Even a partial cash component triggers a buyer-audit follow-up. Standardize on bank transfer to clear this.",
      anchor: "Buyer scorecards",
    });
  }
  if (a.trusteeCadence === "stale") {
    score -= 15;
    flags.push({
      name: "Stale Board of Trustees governance",
      desc: "A trustee board that hasn't met in over 12 months is a documentation and decision-making red flag during inspection.",
      anchor: "Rule 191",
    });
  } else if (a.trusteeCadence === "unminuted") {
    score -= 8;
    flags.push({
      name: "Unminuted trustee meetings",
      desc: "Decisions are valid only if recorded. Re-create meeting minutes and adopt them at the next session.",
      anchor: "Rule 191",
    });
  }
  if (a.workerAwareness === "none") {
    score -= 15;
    flags.push({
      name: "Workers not receiving PF statements",
      desc: "Annual written statements are a non-negotiable buyer-audit checkpoint. Workers interviewed without a statement is the most cited finding.",
      anchor: "Buyer interviews",
    });
  } else if (a.workerAwareness === "on-request") {
    score -= 6;
  }
  if (a.docCurrency === "stale") {
    score -= 10;
    flags.push({
      name: "PF documentation pre-dates Ordinance 65/2025",
      desc: "The 2025 Ordinance changed several provisions. Legacy trust deeds and SOPs need a refresh to stay aligned.",
      anchor: "Ordinance 65/2025",
    });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const zone: Result["zone"] = finalScore >= 75 ? "green" : finalScore >= 50 ? "amber" : "red";

  let title = "Your PF compliance posture";
  let deck = "A snapshot read of where you stand and what to act on next.";
  if (zone === "red") {
    title = "Material exposure detected.";
    deck =
      "The findings below need attention before the next buyer or DIFE visit. The 30-day plan below is sequenced by impact and effort.";
  } else if (zone === "amber") {
    title = "Workable, with specific gaps to close.";
    deck = "You're closer than most. The named flags below are typically closable inside a 30-day window.";
  } else {
    title = "Audit-ready, with light maintenance.";
    deck = "No structural exposure. The actions below are maintenance items to keep the file current.";
  }

  const actions: ActionItem[] = [];
  if (a.pfStatus === "none") {
    actions.push({ when: "Week 1", text: "Engage LLP Services Desk for a Provident Fund constitution and NBR recognition pack." });
    actions.push({ when: "Week 2", text: "Adopt a draft Trust Deed reflecting Ordinance 65/2025 and circulate to nominated trustees." });
    actions.push({ when: "Week 3", text: "Open a dedicated PF bank account and put first contribution in writing." });
    actions.push({ when: "Week 4", text: "Run an Academy session for HR and Finance on operating cadence." });
  } else {
    if (a.contributionMode === "cash" || a.contributionMode === "mixed") {
      actions.push({ when: "Week 1", text: "Move all PF contributions to bank transfer. Document the cut-over date in writing." });
    }
    if (a.workerAwareness === "none" || a.workerAwareness === "on-request") {
      actions.push({ when: "Week 1", text: "Issue annual PF statement to every member. Take photographic evidence of distribution." });
    }
    if (a.trusteeCadence === "stale" || a.trusteeCadence === "unminuted") {
      actions.push({ when: "Week 2", text: "Schedule a Board of Trustees meeting. Adopt prior decisions formally and minute the agenda." });
    }
    if (a.docCurrency === "stale" || a.docCurrency === "moderate") {
      actions.push({ when: "Week 3", text: "Refresh Trust Deed, SOP, and registers against Ordinance 65/2025. Brief Mehnaz Islam to review." });
    }
    if (actions.length < 3) {
      actions.push({ when: "Week 2", text: "Run an Academy review session with HR + Finance to reinforce operating cadence." });
      actions.push({ when: "Week 4", text: "Schedule a quarterly internal audit. Diary the next buyer pre-check 60 days before the visit." });
    }
  }

  return { score: finalScore, zone, title, deck, flags: flags.slice(0, 4), actions };
}

export function AuditFlowContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);

  const total = QUESTIONS.length;
  const q = QUESTIONS[step];
  const value = answers[q?.key ?? ""];
  const progress = submitted ? 100 : ((step + 1) / total) * 100;
  const result = useMemo(() => (submitted ? score(answers) : null), [submitted, answers]);

  const setAnswer = (k: string, v: string) =>
    setAnswers((prev) => ({ ...prev, [k]: v }));

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else setSubmitted(true);
  };
  const back = () => {
    if (submitted) setSubmitted(false);
    else if (step > 0) setStep(step - 1);
  };

  const canProceed = !!value && value.trim().length > 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <div className="lf-af-shell">
            <header className="lf-af-header">
              <div className="lf-af-brand">
                <div className="lf-af-mark">L</div>
                <div>
                  <div className="lf-af-brand-name">Self-Audit</div>
                  <div className="lf-af-brand-sub">Provident Fund · Bangladesh</div>
                </div>
              </div>
              <Link href="/audit" className="lf-af-exit">
                Exit audit
              </Link>
            </header>

            {!submitted ? (
              <>
                <div className="lf-af-progress">
                  <div className="lf-af-progress-top">
                    <span>
                      Question <strong>{step + 1}</strong> of <strong>{total}</strong>
                    </span>
                    <span>~4 minutes total</span>
                  </div>
                  <div className="lf-af-progress-track">
                    <div
                      className="lf-af-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="lf-af-body">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={q.key}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
                    >
                      <div className="lf-af-section-label">{q.section}</div>
                      <h1 className="lf-af-prompt">{q.prompt}</h1>
                      <p className="lf-af-sub">{q.sub}</p>

                      {q.type === "text" ? (
                        <input
                          type="text"
                          className="lf-af-input"
                          placeholder={q.placeholder}
                          value={value || ""}
                          onChange={(e) => setAnswer(q.key, e.target.value)}
                        />
                      ) : null}

                      {q.type === "chips" ? (
                        <div className="lf-af-chips">
                          {q.options.map((o) => (
                            <button
                              key={o}
                              type="button"
                              className="lf-af-chip"
                              data-active={value === o}
                              onClick={() => {
                                setAnswer(q.key, o);
                              }}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {q.type === "chips-stacked" ? (
                        <div className="lf-af-stacked">
                          {q.options.map((o) => {
                            const v = o.value ?? o.label;
                            return (
                              <button
                                key={o.label}
                                type="button"
                                className="lf-af-stacked-opt"
                                data-active={value === v}
                                onClick={() => setAnswer(q.key, v)}
                              >
                                <span className="lf-af-stacked-radio" />
                                <span className="lf-af-stacked-text">
                                  <span className="lf-af-stacked-label">{o.label}</span>
                                  {o.hint ? (
                                    <span className="lf-af-stacked-hint">{o.hint}</span>
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="lf-af-nav">
                  <button
                    type="button"
                    className="lf-af-back"
                    onClick={back}
                    disabled={step === 0}
                    style={{ opacity: step === 0 ? 0 : 1, cursor: step === 0 ? "default" : "pointer" }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="lf-af-next"
                    onClick={next}
                    disabled={!canProceed}
                  >
                    {step === total - 1 ? "Generate report →" : "Next →"}
                  </button>
                </div>

                <div className="lf-af-privacy">
                  <span className="bn">গোপনীয়তা বজায় রাখা হবে।</span>
                  Your answers stay on this device until you save the report. Nothing is shared.
                </div>
              </>
            ) : null}

            {submitted && result ? (
              <motion.div
                className="lf-af-result"
                variants={fadeUp}
                initial="hidden"
                animate="show"
              >
                <div className="lf-af-result-head">
                  <div className="lf-af-score">{result.score}</div>
                  <div>
                    <div className="lf-af-zone" data-zone={result.zone}>
                      {result.zone === "red"
                        ? "Red zone · Material exposure"
                        : result.zone === "amber"
                          ? "Amber zone · Closable gaps"
                          : "Green zone · Audit-ready"}
                    </div>
                    <h1 className="lf-af-result-title">{result.title}</h1>
                    <p className="lf-af-result-deck">{result.deck}</p>
                  </div>
                </div>

                {result.flags.length ? (
                  <div className="lf-af-flags">
                    {result.flags.map((f, i) => (
                      <div key={f.name} className="lf-af-flag">
                        <div className="lf-af-flag-num">{`0${i + 1}`}</div>
                        <div>
                          <div className="lf-af-flag-name">{f.name}</div>
                          <div className="lf-af-flag-desc">{f.desc}</div>
                        </div>
                        <div className="lf-af-flag-anchor">{f.anchor}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="lf-af-actions">
                  <div className="lf-af-actions-label">Sequenced 30-day plan</div>
                  <h2 className="lf-af-actions-title">What to do next</h2>
                  {result.actions.map((a, i) => (
                    <div key={i} className="lf-af-action">
                      <span className="lf-af-action-when">{a.when}</span>
                      <span className="lf-af-action-text">{a.text}</span>
                    </div>
                  ))}
                </div>

                <div className="lf-af-result-cta-row">
                  <Link href="/services" className="lf-au-cta-primary">
                    <span>Start a Services Desk job</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link href="/chat" className="lf-au-cta-primary" style={{ background: "transparent", color: "var(--ink)" }}>
                    <span>Ask LLP a follow-up</span>
                  </Link>
                  <button type="button" className="lf-af-back" onClick={back}>
                    ← Edit answers
                  </button>
                </div>

                <div className="lf-af-privacy">
                  Sample diagnostic for demonstration. Detailed scoring and named-instrument
                  citations available in the production audit. Reviewed by{" "}
                  <strong>Mehnaz Islam</strong>.
                </div>
              </motion.div>
            ) : null}
          </div>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
