"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav, BrandMark } from "@/components/site/site-top-nav";
import "./landing.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

const inViewOnce = { once: true, margin: "-72px 0px" } as const;

const HERO_CHIPS = [
  "Terminating for unauthorised absence",
  "Maternity leave after the 2025 Ordinance",
  "Gratuity calculation basis",
];

const SUBSCRIBE_NOTES = [
  "Amendment alerts",
  "Citation drops",
  "Quarterly compliance digest",
];

type Insight = {
  label: string;
  stat: string;
  unit: string;
  desc: ReactNode;
};

const INSIGHTS: Insight[] = [
  {
    label: "Inspection climate",
    stat: "34",
    unit: "% of RMG factories",
    desc: (
      <>
        had procedural errors flagged in{" "}
        <strong>DIFE inspections this year</strong>. Most were recorded on
        paper, not filed digitally.
      </>
    ),
  },
  {
    label: "Amendment cadence",
    stat: "11",
    unit: "amendments in 20 years",
    desc: (
      <>
        The Labour Act 2006 has been amended through{" "}
        <strong>five Acts, one Rules revision, and one 2025 Ordinance</strong>.
        We track every version.
      </>
    ),
  },
  {
    label: "Editorial standard",
    stat: "100",
    unit: "% citation rate",
    desc: (
      <>
        Every legal claim links to its primary section.{" "}
        <strong>Reviewed by Mehnaz Islam</strong> before publication.
      </>
    ),
  },
];

type CorpusItem = {
  name: string;
  rollup: string;
  stats: ReactNode;
  status: "indexed" | "structural";
  depth: number;
};

const CORPUS: CorpusItem[] = [
  {
    name: "Bangladesh Labour Act, 2006",
    rollup:
      "with Labour Rules 2015, five amending Acts, the 2022 Rules Amendment, and the 2025 Ordinance",
    stats: (
      <>
        <span>
          <strong>354</strong> sections
        </span>
        <span>
          <strong>9</strong> acts and rules
        </span>
        <span>
          <strong>47</strong> briefs
        </span>
        <span>EN · BN</span>
      </>
    ),
    status: "indexed",
    depth: 5,
  },
  {
    name: "Income Tax Act, 2023",
    rollup: "with NBR circulars and employment-related provisions",
    stats: (
      <>
        <span>
          Section map · <strong>Partial</strong>
        </span>
        <span>
          Full text · <strong>Q3 2026</strong>
        </span>
      </>
    ),
    status: "structural",
    depth: 2,
  },
  {
    name: "OSH & Safety",
    rollup: "with Factories Rules, Fire Service Ordinance, and OSH Regulations",
    stats: (
      <>
        <span>
          <strong>7</strong> acts and rules mapped
        </span>
        <span>
          Authorities · <strong>DIFE · Fire</strong>
        </span>
      </>
    ),
    status: "structural",
    depth: 2,
  },
  {
    name: "Corporate Governance",
    rollup: "with Companies Act 1994 and BSEC disclosure rules",
    stats: (
      <>
        <span>
          <strong>4</strong> acts and rules mapped
        </span>
        <span>
          Authorities · <strong>BSEC · MCA</strong>
        </span>
      </>
    ),
    status: "structural",
    depth: 1,
  },
];

type Tool = {
  num: string;
  reads: string;
  name: string;
  desc: string;
  anchor: string;
  href: string;
};

const TOOLS: Tool[] = [
  {
    num: "Tool 01",
    reads: "Covers all four areas",
    name: "Ask LLP.",
    desc:
      "Ask a question in your own words. Get a clear answer first, the section cited, the requirements listed, and the law one click away.",
    anchor: "Open Ask LLP",
    href: "/ask",
  },
  {
    num: "Tool 02",
    reads: "Opens one section in detail",
    name: "Section Biography.",
    desc:
      "Open a single section as a timeline. Amendments, the bodies that shape it, and which team owns it inside a company. Click anything to read more.",
    anchor: "Open Biography",
    href: "/biography",
  },
  {
    num: "Tool 03",
    reads: "Connects across all four areas",
    name: "Situation Map.",
    desc:
      "Describe a real situation. The map composes across labor, tax, OSH, and corporate governance to show what applies and who governs.",
    anchor: "Open Situation Map",
    href: "/ask?mode=situation",
  },
];

type PulseBrief = {
  date: string;
  title: string;
  desc: string;
  kind: string;
};

const PULSE: PulseBrief[] = [
  {
    date: "18 Apr 2026",
    title: "When absence becomes loss of lien.",
    desc:
      "A look at the 2013 amendment's show-cause procedure, with three DIFE enforcement patterns we've seen in the past year.",
    kind: "Brief · Section 27",
  },
  {
    date: "04 Apr 2026",
    title: "The 2025 Ordinance on maternity, unpacked.",
    desc:
      "What the 20-week extension means for 100-plus worker establishments, and how it interacts with the Provident Fund Rules on the tax side.",
    kind: "Brief · Section 46",
  },
  {
    date: "21 Mar 2026",
    title: "Gratuity calculation on last-drawn wage.",
    desc:
      "The 2018 amendment settled a decade of dispute about the calculation basis. Here is how the Labour Court has interpreted it since.",
    kind: "Brief · Section 26(3)",
  },
];

type Arm = {
  num: string;
  name: string;
  desc: string;
  anchor: string;
  href?: string;
  comingSoon?: boolean;
};

const ARMS: Arm[] = [
  {
    num: "I",
    name: "Services Desk",
    desc:
      "Statutory filings, licenses, and compliance work delivered by LLP. Each job scoped within one business day. Fixed fee. One lead. Every step logged.",
    anchor: "See the catalog",
    href: "/services",
  },
  {
    num: "II",
    name: "Academy",
    desc:
      "Become the HR professional who knows the compliance topic cold. Five sessions per topic, personalized per company, Session 1 free. ৳990 for Sessions 2-5. Provident Fund and Gratuity at launch.",
    anchor: "See the Paths",
    href: "/academy",
  },
  {
    num: "III",
    name: "Audit",
    desc:
      "A self-audit workspace for HR and compliance teams to check their own setup against the law. Structured checklists, evidence capture, gap reports, and remediation tracking.",
    anchor: "Begin an audit",
    comingSoon: true,
  },
  {
    num: "IV",
    name: "Expert Network",
    desc:
      "When an AI answer is insufficient, book a human reviewer who knows the area. Labor practitioners, compliance specialists, and industry experts, rated and scoped.",
    anchor: "Book a reviewer",
  },
];

const FOOTER_LINKS: { label: string; items: { label: string; href?: string }[] }[] = [
  {
    label: "Product",
    items: [
      { label: "Ask LLP", href: "/ask" },
      { label: "Research Lab", href: "/research" },
      { label: "Services Desk", href: "/services" },
      { label: "Academy", href: "/academy" },
      { label: "Audit" },
      { label: "Expert Network" },
      { label: "Headhunting", href: "/headhunting" },
    ],
  },
  {
    label: "Firm",
    items: [
      { label: "About" },
      { label: "Editorial standards" },
      { label: "Careers" },
      { label: "Contact" },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Terms" },
      { label: "Privacy" },
      { label: "Source attribution" },
      { label: "Amendment log" },
    ],
  },
];

export function LandingPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [askValue, setAskValue] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const route = (q: string) => {
    const trimmed = q.trim();
    router.push(trimmed ? `/chat?q=${encodeURIComponent(trimmed)}` : "/chat");
  };

  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="lf-page"
      data-theme={themeAttr}
      suppressHydrationWarning
    >
      <SiteTopNav />

      <main>
        {/* -- Hero ------------------------------------------------ */}
        <section className="lf-hero">
          <div className="lf-hero-grid">
            <motion.div variants={heroStagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ I</span>A new kind of
                research instrument
              </motion.div>
              <motion.h1 variants={fadeUp} className="lf-hero-title">
                A research lab for{" "}
                <em>Bangladesh labor and compliance law.</em>
              </motion.h1>
              <motion.p variants={fadeUp} className="lf-hero-deck">
                We read the Labor Act the way it is actually read in practice:
                alongside the tax code, the safety rules, and the governance
                framework. Ask a question. Get an answer phrased like a
                conversation, cited like a statute.
              </motion.p>

              <motion.div variants={fadeUp}>
                <AskField
                  value={askValue}
                  onChange={setAskValue}
                  onSubmit={() => route(askValue)}
                  placeholder="e.g. Can we terminate for 12 days absence?"
                />
              </motion.div>

              <motion.div variants={fadeUp} className="lf-chips">
                {HERO_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="lf-chip"
                    onClick={() => route(c)}
                  >
                    {c}
                  </button>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="lf-trust">
                <span className="lf-trust-item">
                  47 editorial briefs published
                </span>
                <span className="lf-trust-item">
                  354 sections indexed · 9 acts and rules
                </span>
                <span className="lf-trust-item">
                  First question free · no signup
                </span>
              </motion.div>
            </motion.div>

            <DeskCard onClick={() => router.push("/biography")} />
          </div>
        </section>

        {/* -- R17 · Insight strip -------------------------------- */}
        <div className="lf-insight-wrap" data-admin-surface="landing_insights">
          <motion.div
            className="lf-insight-strip"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            {INSIGHTS.map((i) => (
              <motion.div key={i.label} className="lf-insight-item" variants={fadeUp}>
                <span className="lf-insight-label">{i.label}</span>
                <h3 className="lf-insight-stat">
                  {i.stat}
                  <span className="lf-unit">{i.unit}</span>
                </h3>
                <p className="lf-insight-desc">{i.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* -- § II · Library and Instruments --------------------- */}
        <section className="lf-section">
          <motion.div
            className="lf-section-header"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            <motion.div variants={fadeUp} className="lf-kicker">
              <span className="lf-kicker-mark">§ II</span>The library and the
              tools
            </motion.div>
            <motion.h2 variants={fadeUp} className="lf-section-title">
              Four areas of law. Three tools. <em>Used together.</em>
            </motion.h2>
            <motion.p variants={fadeUp} className="lf-section-deck">
              The laws we cover and the tools we built around them. Honest
              about depth. Specific about what each tool does.
            </motion.p>
          </motion.div>

          <div className="lf-composite">
            <div className="lf-composite-col" data-admin-surface="corpus">
              <div>
                <div className="lf-composite-col-kicker">
                  Left side · The library
                </div>
                <h3 className="lf-composite-col-title">
                  Four <em>areas of law.</em>
                </h3>
                <p className="lf-composite-col-deck">
                  At launch, one is fully indexed. Three carry structural
                  knowledge. No claim of depth we do not have.
                </p>
              </div>

              <motion.div
                className="lf-corpus-list"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                {CORPUS.map((c) => (
                  <motion.div key={c.name} className="lf-corpus-item" variants={fadeUp}>
                    <div className="lf-corpus-left">
                      <h4 className="lf-corpus-name">{c.name}</h4>
                      <p className="lf-corpus-rollup">{c.rollup}</p>
                      <div className="lf-corpus-stats">{c.stats}</div>
                    </div>
                    <div className="lf-corpus-right">
                      <span className={`lf-corpus-status lf-${c.status}`}>
                        {c.status === "indexed" ? "Indexed" : "Structural"}
                      </span>
                      <div className="lf-corpus-depth">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={`lf-d${i < c.depth ? " lf-f" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div
              className="lf-composite-divider"
              initial={{ opacity: 0, scaleY: 0.4 }}
              whileInView={{ opacity: 1, scaleY: 1 }}
              viewport={inViewOnce}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              style={{ transformOrigin: "center" }}
            />

            <div className="lf-composite-col">
              <div>
                <div className="lf-composite-col-kicker">
                  Right side · The tools
                </div>
                <h3 className="lf-composite-col-title">
                  Three <em>tools.</em>
                </h3>
                <p className="lf-composite-col-deck">
                  Each tool works on the law differently. Ask LLP is the
                  conversation. Biography opens one section in detail.
                  Situation Map shows how multiple laws connect.
                </p>
              </div>

              <motion.div
                className="lf-tools-list"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                {TOOLS.map((t) => (
                  <motion.button
                    key={t.num}
                    type="button"
                    className="lf-tool"
                    onClick={() => router.push(t.href)}
                    variants={fadeUp}
                  >
                    <div className="lf-tool-head">
                      <span className="lf-tool-num">{t.num}</span>
                      <span className="lf-tool-reads">{t.reads}</span>
                    </div>
                    <h4 className="lf-tool-name">{t.name}</h4>
                    <p className="lf-tool-desc">{t.desc}</p>
                    <div className="lf-tool-anchor">{t.anchor}</div>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* -- § III · Pulse --------------------------------------- */}
        <section className="lf-section">
          <motion.div
            className="lf-section-header"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            <motion.div variants={fadeUp} className="lf-kicker">
              <span className="lf-kicker-mark">§ III</span>Recent editorial work
            </motion.div>
            <motion.h2 variants={fadeUp} className="lf-section-title">What we read this fortnight.</motion.h2>
            <motion.p variants={fadeUp} className="lf-section-deck">
              The lab publishes on a biweekly cadence. Briefs are editorially
              reviewed before publication.
            </motion.p>
          </motion.div>
          <motion.div
            className="lf-pulse-grid"
            data-admin-surface="pulse_briefs"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            {PULSE.map((p) => (
              <motion.article key={p.title} className="lf-pulse-card" variants={fadeUp}>
                <span className="lf-pulse-date">{p.date}</span>
                <h3 className="lf-pulse-title">{p.title}</h3>
                <p className="lf-pulse-desc">{p.desc}</p>
                <div className="lf-pulse-tag">
                  <span className="lf-pulse-tag-kind">{p.kind}</span>
                  <span className="lf-pulse-tag-read">Read</span>
                </div>
              </motion.article>
            ))}
          </motion.div>
          <motion.div
            className="lf-pulse-review"
            data-admin-surface="currently_under_review"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inViewOnce}
            transition={{ duration: 0.55, ease: EASE_OUT }}
          >
            <span className="lf-pulse-review-label">Currently under review</span>
            <p className="lf-pulse-review-text">
              The 2025 Ordinance's maternity leave extension created a
              tax-treatment question for the benefit above 16 weeks. The NBR
              has not yet clarified. We are tracking circulars weekly and
              expect editorial guidance by <strong>mid-May 2026</strong>.
            </p>
          </motion.div>
        </section>

        {/* -- § IV · Arms ----------------------------------------- */}
        <section className="lf-section">
          <motion.div
            className="lf-section-header"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            <motion.div variants={fadeUp} className="lf-kicker">
              <span className="lf-kicker-mark">§ IV</span>When reading is not
              enough
            </motion.div>
            <motion.h2 variants={fadeUp} className="lf-section-title">
              Four ways LLP helps you take action.
            </motion.h2>
            <motion.p variants={fadeUp} className="lf-section-deck">
              Research is where the question gets answered. These four routes
              are how the answer becomes action.
            </motion.p>
          </motion.div>
          <motion.div
            className="lf-arms-grid"
            data-admin-surface="arms"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            {ARMS.map((a) => {
              const MotionTag = a.href ? motion.a : motion.div;
              return (
                <MotionTag
                  key={a.name}
                  className="lf-arm-card"
                  variants={fadeUp}
                  {...(a.href ? { href: a.href } : {})}
                >
                  {a.comingSoon ? (
                    <span className="lf-arm-coming-tag">Launching Soon</span>
                  ) : null}
                  <div className="lf-arm-num">{a.num}</div>
                  <h3 className="lf-arm-name">{a.name}</h3>
                  <p className="lf-arm-desc">{a.desc}</p>
                  <div className="lf-arm-anchor">{a.anchor}</div>
                </MotionTag>
              );
            })}
          </motion.div>
        </section>

        {/* -- § V · Subscribe ------------------------------------- */}
        <section className="lf-final">
          <motion.div
            className="lf-final-inner"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            <motion.div
              variants={fadeUp}
              className="lf-kicker"
              style={{ marginBottom: "var(--s-3)", justifyContent: "center" }}
            >
              <span className="lf-kicker-mark">§ V</span>Stay in the loop
            </motion.div>
            <motion.h2 variants={fadeUp} className="lf-final-title">
              Subscribe to the lab.{" "}
              <em>Read the Act before the news does.</em>
            </motion.h2>
            <motion.p variants={fadeUp} className="lf-final-deck">
              Get amendment alerts, fresh citations, and our quarterly
              compliance digest. No spam. Unsubscribe in one click.
            </motion.p>
            <motion.div variants={fadeUp}>
              <SubscribeField />
            </motion.div>
            <motion.div variants={fadeUp} className="lf-chips lf-chips-center">
              {SUBSCRIBE_NOTES.map((c) => (
                <span key={c} className="lf-chip" aria-hidden="true">
                  {c}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* -- Footer ---------------------------------------------- */}
        <footer className="lf-site-footer">
          <motion.div
            className="lf-footer-grid"
            variants={fadeIn}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            <div className="lf-footer-brand">
              <div className="lf-footer-brand-line">
                <BrandMark size={22} />
                <span className="lf-footer-brand-name">Labor Law Partner</span>
              </div>
              <p className="lf-footer-brand-desc">
                Bangladesh labor and compliance law, made workable. Honest
                about depth. Careful about citations. Built for close reading.
              </p>
              <div className="lf-footer-team">
                <div className="lf-footer-team-label">The lab</div>
                <p className="lf-footer-team-line">
                  Led by <strong>Tanbhir Siddiki</strong> · Editorial{" "}
                  <strong>Mehnaz Islam</strong> · Operations{" "}
                  <strong>Shumon Ahmed</strong> and{" "}
                  <strong>Muhib Hossain</strong> · Technology{" "}
                </p>
              </div>
            </div>
            {FOOTER_LINKS.map((col) => (
              <div key={col.label}>
                <div className="lf-footer-col-label">{col.label}</div>
                {col.items.map((it) =>
                  it.href ? (
                    <a key={it.label} className="lf-footer-link" href={it.href}>
                      {it.label}
                    </a>
                  ) : (
                    <span key={it.label} className="lf-footer-link">
                      {it.label}
                    </span>
                  )
                )}
              </div>
            ))}
          </motion.div>
          <div className="lf-footer-foot">
            <span>© 2026 Labor Law Partner · Dhaka, Bangladesh</span>
            <div className="lf-footer-foot-right">
              <span>Design Foundation v1.9</span>
              <span>Content v2026.04.26</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
    </MotionConfig>
  );
}

function AskField({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <div className="lf-ask-glass">
      <input
        className="lf-ask-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="lf-ask-submit lf-glow"
        onClick={onSubmit}
      >
        <span>Ask</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}

type SubscribeStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function SubscribeField() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>({ kind: "idle" });

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ kind: "error", message: "Enter your email to subscribe." });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data.error || "Subscription failed. Try again.",
        });
        return;
      }
      const message =
        data.status === "already_subscribed"
          ? "You're already on the list. Thanks for staying close."
          : data.status === "reactivated"
            ? "Welcome back. Resubscribed."
            : "Subscribed. Check your inbox for a confirmation.";
      setStatus({ kind: "success", message });
      setEmail("");
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please try again.",
      });
    }
  };

  const isSubmitting = status.kind === "submitting";

  return (
    <div>
      <form
        className="lf-ask-glass"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="email"
          autoComplete="email"
          className="lf-ask-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={isSubmitting}
          aria-label="Email address"
        />
        <button
          type="submit"
          className="lf-ask-submit lf-glow"
          disabled={isSubmitting}
        >
          <span>{isSubmitting ? "Sending..." : "Subscribe"}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </button>
      </form>
      {status.kind === "success" && (
        <p
          role="status"
          style={{
            marginTop: "var(--s-2)",
            textAlign: "center",
            color: "var(--ink-muted, currentColor)",
            fontSize: "0.9rem",
          }}
        >
          {status.message}
        </p>
      )}
      {status.kind === "error" && (
        <p
          role="alert"
          style={{
            marginTop: "var(--s-2)",
            textAlign: "center",
            color: "#b00020",
            fontSize: "0.9rem",
          }}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}

type DeskEvent = {
  year: string;
  title: string;
  meta: string;
  state: "historical" | "current";
};

const DESK_EVENTS: DeskEvent[] = [
  {
    year: "2006",
    title: "Enacted at 16 weeks leave",
    meta: "Act XLII of 2006",
    state: "historical",
  },
  {
    year: "2018",
    title: "Benefit calculation refined",
    meta: "2018 Amendment · Section 50",
    state: "historical",
  },
  {
    year: "2025",
    title: "Leave extended to 20 weeks",
    meta: "2025 Ordinance · 100+ worker establishments",
    state: "current",
  },
];

function DeskCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.aside
      className="lf-desk-glass"
      data-admin-surface="today_at_the_lab"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.18, ease: EASE_OUT }}
    >
      <div className="lf-desk-header">
        <div className="lf-desk-kicker">Today at the lab</div>
        <span className="lf-desk-timestamp">24 Apr 2026 · 09:22</span>
      </div>
      <div className="lf-desk-ref">§ BANGLADESH LABOUR ACT 2006</div>
      <h2 className="lf-desk-title">
        Section 46 · <em>Maternity leave</em>
      </h2>
      <motion.div
        className="lf-desk-timeline"
        variants={stagger}
        initial="hidden"
        animate="show"
        transition={{ delayChildren: 0.45 }}
      >
        {DESK_EVENTS.map((e) => (
          <motion.div key={e.year} className={`lf-desk-event lf-${e.state}`} variants={fadeUp}>
            <div className="lf-desk-year">{e.year}</div>
            <div className="lf-desk-dot">
              <div className="lf-desk-dot-mark" />
            </div>
            <div className="lf-desk-event-body">
              <span className="lf-desk-event-t">{e.title}</span>
              <span className="lf-desk-event-m">{e.meta}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
      <div className="lf-desk-obs">
        <div className="lf-desk-obs-label">Currently under editorial review</div>
        <p className="lf-desk-obs-text">
          The 2025 Ordinance extended maternity leave from 16 to 20 weeks for
          establishments above 100 workers. Payroll treatment under the Income
          Tax Act remains being reviewed.
        </p>
      </div>
      <div className="lf-desk-foot">
        <span className="lf-desk-foot-link">Read the section biography →</span>
        <span className="lf-desk-timestamp">47 briefs published</span>
      </div>
    </motion.aside>
  );
}
