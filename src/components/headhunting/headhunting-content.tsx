"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, MotionConfig, type Variants } from "framer-motion";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { sanitize, inlineSchema } from "@/lib/sanitize-html";
import "@/components/landing/landing.css";
import "./headhunting-styles.css";

/* ──────────────────────────────────────────────────────────────────── */
/*  Motion variants (Emil-aligned, Foundation v1.9)                     */
/* ──────────────────────────────────────────────────────────────────── */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
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

/* ──────────────────────────────────────────────────────────────────── */
/*  Routes                                                              */
/* ──────────────────────────────────────────────────────────────────── */
const HIRING_HREF = "/headhunting/client";
const SCOUT_HREF = "/headhunting/scout/join";
const PARTNER_HREF = "mailto:partners@laborlawpartner.com?subject=LLP%20Partner%20Collaboration";

/* ──────────────────────────────────────────────────────────────────── */
/*  Country reach (admin-managed in v56; static here for marketing)     */
/* ──────────────────────────────────────────────────────────────────── */
type Country = {
  name: string;
  flag: string;
  scouts: number;
  functions: string;
  addedWhen: string;
  isNew?: boolean;
  pending?: boolean;
};
const COUNTRIES: Country[] = [
  { name: "Bangladesh", flag: "🇧🇩", scouts: 8, functions: "Multi-sector", addedWhen: "Founding" },
  { name: "India", flag: "🇮🇳", scouts: 3, functions: "Finance · Tech", addedWhen: "12 weeks" },
  { name: "UAE", flag: "🇦🇪", scouts: 2, functions: "Leadership", addedWhen: "6 weeks" },
  { name: "Singapore", flag: "🇸🇬", scouts: 2, functions: "Commercial", addedWhen: "5 weeks" },
  { name: "United Kingdom", flag: "🇬🇧", scouts: 1, functions: "Compliance", addedWhen: "This week", isNew: true },
  { name: "United States", flag: "🇺🇸", scouts: 1, functions: "Technology", addedWhen: "This week", isNew: true },
  { name: "Malaysia", flag: "🇲🇾", scouts: 0, functions: "Under review", addedWhen: "Pending", pending: true },
  { name: "Germany", flag: "🇩🇪", scouts: 0, functions: "Under review", addedWhen: "Pending", pending: true },
];
const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => !c.pending);

/* ──────────────────────────────────────────────────────────────────── */
/*  Walkthrough stages                                                  */
/* ──────────────────────────────────────────────────────────────────── */
type Role = "corp" | "scout" | "applicant";
type DashState = { stage: string; msg: string } | null;
type AiMarker = { label: string; body: string };
type Fork = {
  label: string;
  options: { label: string; selected?: boolean }[];
  note: string;
};
type VisRow = {
  field: string;
  cls: "calibrated" | "masked" | "restricted";
  clsLabel: string;
};
type Visibility = { label: string; rows: VisRow[] };

type Stage = {
  n: number;
  num: string;
  name: string;
  gated: boolean;
  statusKicker: string;
  action: React.ReactNode;
  detail: string;
  ai?: AiMarker;
  fork?: Fork;
  visibility?: Visibility;
  dashes: Record<Role, DashState>;
};

const STAGES: Stage[] = [
  {
    n: 1, num: "01", name: "Submitted", gated: false,
    statusKicker: "Stage 01 · Submitted",
    action: "Hiring request received with raw JD. Logged into the LLP Talent Hunt admin environment.",
    detail: "Source material captured · request acknowledged within 4 business hours",
    dashes: {
      corp: { stage: "Your request", msg: "Hiring request submitted · LLP confirmed receipt" },
      scout: null,
      applicant: null,
    },
  },
  {
    n: 2, num: "02", name: "Role Blueprint", gated: true,
    statusKicker: "Stage 02 · Role Blueprint",
    action: (
      <>
        <strong>Shumon Ahmed</strong> profiling the mandate · structuring the internal blueprint record.
      </>
    ),
    detail: "AI extracts what is explicit, suggests what is inferable, flags what is missing · Human admin validates and decides",
    ai: {
      label: "AI",
      body:
        "<strong>Auto-extracted</strong>: role title, reporting line, location, experience threshold. <strong>Flagged</strong>: 6 missing fields including success profile and Tolerance Areas. Awaiting human input.",
    },
    dashes: {
      corp: { stage: "Stage 02", msg: "LLP profiling your role · client validation packet coming" },
      scout: null,
      applicant: null,
    },
  },
  {
    n: 3, num: "03", name: "Client validation", gated: true,
    statusKicker: "Stage 03 · Client validation",
    action: (
      <>
        Client confirms Must-Haves, Critical Match Points, confidentiality assumptions, and the{" "}
        <strong>sourcing route</strong>.
      </>
    ),
    detail: "Client approves all as proposed, revises selected fields, or answers flagged unresolved items",
    fork: {
      label: "Sourcing route · client decision",
      options: [
        { label: "Scout network release", selected: true },
        { label: "LLP recruitment team only" },
        { label: "Both, scouts and LLP team" },
      ],
      note: "Client chooses route per mandate. For sensitive senior roles, LLP team only is common, no scout exposure.",
    },
    dashes: {
      corp: { stage: "Needs your input", msg: "Review brief · confirm sourcing route · 3 days remaining" },
      scout: null,
      applicant: null,
    },
  },
  {
    n: 4, num: "04", name: "Release brief", gated: true,
    statusKicker: "Stage 04 · Scout-safe release brief",
    action:
      "A separate release brief is derived from the client-finalized blueprint · sensitive fields masked or restricted.",
    detail: "For senior or sensitive mandates, brief becomes more masked, not more literal",
    visibility: {
      label: "Field-level visibility classes applied",
      rows: [
        { field: "Role title", cls: "calibrated", clsLabel: "Calibrated" },
        { field: "Employer identity", cls: "masked", clsLabel: "Masked" },
        { field: "Compensation band", cls: "restricted", clsLabel: "Restricted" },
      ],
    },
    dashes: {
      corp: { stage: "Stage 04", msg: "Brief released · scout pool engaged" },
      scout: null,
      applicant: null,
    },
  },
  {
    n: 5, num: "05", name: "Conflict filter", gated: true,
    statusKicker: "Stage 05 · Conflict filter",
    action: (
      <>
        <strong>Shumon Ahmed</strong> reviewing system flags · approving final scout list before release.
      </>
    ),
    detail: "Current employment, recent past, declared conflicts, and client manual exclusions applied · 24-month default cooling",
    ai: {
      label: "AI",
      body:
        "<strong>Auto-detected</strong>: 2 scouts hold direct competitor employment within 24 months · auto-excluded. <strong>Flagged</strong>: 1 scout has tangential past affiliation · awaiting human override decision.",
    },
    dashes: {
      corp: { stage: "Stage 05", msg: "Pre-release filtering complete · 5 eligible scouts" },
      scout: null,
      applicant: null,
    },
  },
  {
    n: 6, num: "06", name: "Sourcing", gated: false,
    statusKicker: "Stage 06 · Sourcing",
    action: "Eligible scouts within function, industry, region activate · source candidates with commentary.",
    detail: "5 scouts active · 12 days to submit · LLP TA team running parallel direct outreach",
    dashes: {
      corp: { stage: "Stage 06", msg: "Sourcing active · 5 scouts engaged" },
      scout: { stage: "New mandate", msg: "Senior Quality Manager · matches your scope · 12 days to submit" },
      applicant: { stage: "Your application", msg: "Application registered via scout referral · awaiting screening" },
    },
  },
  {
    n: 7, num: "07", name: "LLP screening", gated: true,
    statusKicker: "Stage 07 · LLP screening",
    action: (
      <>
        <strong>Muhib Hossain</strong> filtering candidate flow · applying Critical Match Points and Deal Breakers.
      </>
    ),
    detail: "Talent team reviews each submission against the client-finalized blueprint · only matched profiles advance",
    dashes: {
      corp: { stage: "Stage 07", msg: "LLP screening 8 candidates · shortlist coming" },
      scout: { stage: "Your submissions", msg: "3 candidates submitted · under LLP review" },
      applicant: { stage: "Under review", msg: "LLP screening your profile · response in 3-5 days" },
    },
  },
  {
    n: 8, num: "08", name: "Employer review", gated: false,
    statusKicker: "Stage 08 · Employer review",
    action: "Filtered shortlist reaches the hiring manager with match logic notes · every movement tracked.",
    detail: "Employer reviews 2 shortlisted candidates · interview scheduling next",
    dashes: {
      corp: { stage: "Needs your review", msg: "2 shortlisted candidates · ready for interview decision" },
      scout: { stage: "Your candidates", msg: "1 of 3 shortlisted · interview pending" },
      applicant: { stage: "Shortlisted", msg: "Employer reviewing your profile · interview likely" },
    },
  },
  {
    n: 9, num: "09", name: "Closed", gated: false,
    statusKicker: "Stage 09 · Closed",
    action: "Mandate closes on placement · scout commission paid within 30 days · client receives sealed mandate pack.",
    detail: "Closure recorded · audit trail preserved · success metric updated",
    dashes: {
      corp: { stage: "Placement", msg: "Hire confirmed · sealed mandate pack delivered" },
      scout: { stage: "Commission", msg: "Your candidate placed · commission earned · 30-day cycle" },
      applicant: { stage: "Offer accepted", msg: "Placement confirmed · welcome to your new role" },
    },
  },
];

/* ──────────────────────────────────────────────────────────────────── */
/*  Static section data                                                 */
/* ──────────────────────────────────────────────────────────────────── */
const RECEIVES = [
  {
    label: "Output I",
    titleLead: "A clearer ",
    titleAccent: "brief.",
    body:
      "LLP's Role Blueprint process returns a refined search brief to the client, covering role identity, hard gates, match logic, success profile, and search architecture. Reviewed before any scout sees anything.",
  },
  {
    label: "Output II",
    titleLead: "A screened ",
    titleAccent: "shortlist.",
    body:
      "Candidates reach you after LLP filtering. Each shortlist arrival is accompanied by match logic notes, relevance scoring, and any flags that matter for your decision.",
  },
  {
    label: "Output III",
    titleLead: "A tracked ",
    titleAccent: "mandate.",
    body:
      "The mandate tracker shows every stage, every movement, every pending action. You always know where your search stands without asking.",
  },
];

const COMMERCIAL_TERMS: { label: string; value: React.ReactNode }[] = [
  {
    label: "Mid-level",
    value: (
      <>
        From <strong>20%</strong> of first-year compensation <em>· manager and senior IC roles</em>
      </>
    ),
  },
  {
    label: "Senior",
    value: (
      <>
        <strong>25-30%</strong> of first-year compensation <em>· director, head-of-function roles</em>
      </>
    ),
  },
  {
    label: "C-suite",
    value: (
      <>
        Up to <strong>33%</strong> of first-year compensation <em>· CXO, board-level, succession mandates</em>
      </>
    ),
  },
  {
    label: "Payment",
    value: (
      <>
        <strong>On placement only.</strong> Payable within 14 days of the hire joining.
      </>
    ),
  },
  {
    label: "Guarantee",
    value: (
      <>
        <strong>Replacement guarantee</strong> if the hire departs within the first 90 days, for reasons within scope.
      </>
    ),
  },
];

const FUNCTIONS = [
  "Finance & Accounting",
  "Supply Chain & Operations",
  "HR & People",
  "Engineering & Manufacturing",
  "Legal & Compliance",
  "Design & Product",
  "Strategy & Consulting",
  "Research & Analytics",
  "Leadership / C-suite",
];

const MECHANICS: { label: string; value: string; sub: string; desc: React.ReactNode }[] = [
  {
    label: "Commission",
    value: "20",
    sub: "% of placement fee",
    desc: (
      <>
        Transparent share on every successful placement. <strong>Typical placement fees BDT 3-12 lakh</strong>{" "}
        depending on role seniority. Paid within 30 days of placement confirmation. No cap, no tier gating.
      </>
    ),
  },
  {
    label: "Scope ceiling",
    value: "3",
    sub: "function × industry × region",
    desc: (
      <>
        You choose your scope. Scouts only receive mandates <strong>matching their specialization</strong>.
        Capacity-aware routing.
      </>
    ),
  },
  {
    label: "Human gated",
    value: "5",
    sub: "gates before scouts",
    desc: (
      <>
        Every mandate passes five human checks before it reaches you. <strong>Five gates</strong> between client
        submission and your queue.
      </>
    ),
  },
];

const REPS: { avatar: string; fn: string; where: string; v: string; l: string; note: React.ReactNode }[] = [
  {
    avatar: "৳",
    fn: "Commission per placement",
    where: "Of LLP's mandate fee",
    v: "15-20%",
    l: "of placement fee",
    note: (
      <>
        For typical mid-management mandates, this works out to <strong>৳50,000 to ৳150,000</strong> per
        successful placement. Senior mandates can be larger.
      </>
    ),
  },
  {
    avatar: "⌛",
    fn: "Mandate cycle",
    where: "Submission to placement",
    v: "3-6 weeks",
    l: "typical close",
    note: (
      <>
        You submit, LLP screens within <strong>3-5 business days</strong>, employer reviews, interview rounds
        happen, offer extends. Commission paid within 30 days of joining.
      </>
    ),
  },
  {
    avatar: "⏱",
    fn: "Effort per placement",
    where: "Realistic estimate",
    v: "4-8 hours",
    l: "per placement",
    note:
      "Reaching out to candidates in your network, brief screening conversations, and submitting profiles. LLP handles screening, interview coordination, employer alignment, and closing.",
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "What kind of hiring needs is this built for?",
    a: "Specialist, leadership, trust-sensitive, or hard-to-reach roles where a structured sourcing approach outperforms a generic job posting. Examples include niche senior hires, confidential successions, specialized functional leadership, and cross-border placements where discretion matters.",
  },
  {
    q: "Is this a job portal or a public job board?",
    a: "LLP Headhunting is a structured hiring support model with scout-led sourcing, human-gated release, and workflow visibility. Candidates are surfaced through scout networks and LLP sourcing. Senior or sensitive roles are released only to specialized scout subgroups.",
  },
  {
    q: "What happens after an employer submits a request?",
    a: "LLP reviews the request, opens the Role Blueprint module, and profiles the mandate. A client validation packet returns to you for confirmation on search-driving points. Once confirmed, LLP generates a scout-safe release brief, runs conflict filtering, and releases the mandate to eligible scouts. You see tracked progress throughout.",
  },
  {
    q: "Do employers receive every CV submitted by scouts?",
    a: "LLP's talent team screens the candidate flow before it reaches employer review. Employers see a filtered shortlist with match logic notes. Every submission is checked against the client-finalized blueprint (Critical Match Points, Deal Breakers, scope fit) before any employer review.",
  },
  {
    q: "Can recruitment firms or search partners collaborate with LLP?",
    a: (
      <>
        Yes, through a separate B2B route called{" "}
        <a href={PARTNER_HREF}>Partner Collaboration</a>, designed for recruitment firms, executive search firms,
        staffing agencies, and cross-border recruitment partners. Different from the individual Scout Network,
        this route is for firms, not solo scouts. Firm-to-firm mandate sharing with shared commercials.
      </>
    ),
  },
  {
    q: "Can scout participation and role handling be confidential?",
    a: "Yes. Visibility classes range from Internal only to Masked scout visible to Restricted scout visible. Sensitive leadership searches route to smaller trusted scout subgroups and require human release approval even after system checks pass. Employer identity exposure is controlled by the client, not the system.",
  },
];

/* ──────────────────────────────────────────────────────────────────── */
/*  Component                                                           */
/* ──────────────────────────────────────────────────────────────────── */
export function HeadhuntingContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr}>
        <SiteTopNav />
        <main>
          <section className="lf-hh-wrap">
            <Hero />
            <Walkthrough />
            <Outputs />
            <Commercial />
          </section>

          <ScoutSection />

          <section className="lf-hh-wrap">
            <Countries />
            <Faq />
            <FinalCta />
          </section>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Hero                                                                */
/* ──────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <motion.header
      className="lf-hh-hero"
      variants={heroStagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp} className="lf-kicker">
        <span className="lf-kicker-mark">§ I</span>
        LLP Headhunting
      </motion.div>
      <motion.h1 variants={fadeUp} className="lf-hh-hero-title">
        A scout-led hiring model for <em>hard-to-reach talent.</em>
      </motion.h1>
      <motion.p variants={fadeUp} className="lf-hh-hero-deck">
        LLP Headhunting connects employers, scouts, and partner firms through a structured sourcing model designed
        for hard-to-reach, niche, and trust-sensitive roles. Think a Regional Quality Head for a leather exporter
        with LWG audit experience and Italian language, or a CFO replacement kept confidential until the board
        signs. Every mandate moves through a clearer process, from scoped brief to screened shortlist.
      </motion.p>
      <motion.div variants={fadeUp} className="lf-hh-cta-row">
        <Link href={HIRING_HREF} className="lf-hh-cta-primary">
          <span>Request hiring support</span>
          <Arrow />
        </Link>
        <Link href={SCOUT_HREF} className="lf-hh-cta-secondary">
          Join the scout network
        </Link>
      </motion.div>
      <motion.div variants={fadeUp} className="lf-hh-live">
        <span>Scouts and network reach</span>
        <span className="lf-hh-live-flags" aria-hidden="true">
          {ACTIVE_COUNTRIES.map((c) => (
            <span key={c.name} className="lf-hh-live-flag" title={`${c.name} · ${c.scouts} scouts`}>
              {c.flag}
            </span>
          ))}
        </span>
        <span>
          <strong>{ACTIVE_COUNTRIES.length}</strong> countries
        </span>
      </motion.div>
    </motion.header>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Walkthrough (interactive)                                           */
/* ──────────────────────────────────────────────────────────────────── */
function Walkthrough() {
  const [current, setCurrent] = useState(1);
  const [paused, setPaused] = useState(false);
  const [following, setFollowing] = useState<Role | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(() => {
      setCurrent((c) => (c === STAGES.length ? 1 : c + 1));
    }, 4200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [current, paused]);

  const stage = STAGES[current - 1];

  const jumpTo = (n: number) => {
    setCurrent(n);
  };
  const togglePause = () => setPaused((p) => !p);
  const follow = (role: Role) => setFollowing((f) => (f === role ? null : role));

  return (
    <motion.section
      className="lf-hh-section"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <motion.div variants={fadeUp} className="lf-hh-section-kicker">
        § II · The mandate, end to end
      </motion.div>
      <motion.h2 variants={fadeUp} className="lf-hh-section-title">
        How a mandate moves, <em>end to end.</em>
      </motion.h2>
      <motion.p variants={fadeUp} className="lf-hh-section-deck">
        A walkthrough mandate built to show the structured process. When real mandate #M-001 closes, this section
        becomes a live tracker.
      </motion.p>

      <motion.div variants={fadeUp} className="lf-hh-walk">
        <div className="lf-hh-walk-head">
          <div>
            <div className="lf-hh-walk-kicker">Animated walkthrough · One mandate, end to end</div>
            <h3 className="lf-hh-walk-title">
              Mandate <em>#W-001 · Senior Quality Manager</em>
            </h3>
            <p className="lf-hh-walk-sub">
              A walkthrough mandate built to show the structured process. When real mandate{" "}
              <strong>#M-001</strong> closes, this section becomes a live tracker.
            </p>
          </div>
          <div className="lf-hh-walk-controls">
            <span>
              Stage <strong>{stage.num}</strong> of {STAGES.length}
            </span>
            <button
              type="button"
              className="lf-hh-walk-pause"
              onClick={togglePause}
              aria-label={paused ? "Resume walkthrough" : "Pause walkthrough"}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
              <span>{paused ? "Resume" : "Pause"}</span>
            </button>
          </div>
        </div>

        <div className="lf-hh-walk-rail" role="tablist">
          {STAGES.map((s) => (
            <button
              type="button"
              key={s.n}
              className="lf-hh-walk-stage"
              data-active={s.n === current}
              onClick={() => jumpTo(s.n)}
              role="tab"
              aria-selected={s.n === current}
            >
              <span className="lf-hh-walk-stage-num">{s.num}</span>
              <span className="lf-hh-walk-stage-name">{s.name}</span>
              {s.gated ? <span className="lf-hh-walk-stage-gate">Gate</span> : null}
            </button>
          ))}
        </div>

        <div className="lf-hh-walk-body">
          <div className="lf-hh-walk-status" data-gated={stage.gated}>
            <AnimatePresence mode="wait">
              <motion.div
                key={stage.n}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
                style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}
              >
                <div className="lf-hh-status-kicker">{stage.statusKicker}</div>
                <p className="lf-hh-status-action">{stage.action}</p>
                <p className="lf-hh-status-detail">{stage.detail}</p>
                {stage.ai ? (
                  <div className="lf-hh-ai">
                    <div className="lf-hh-ai-icon">{stage.ai.label}</div>
                    {/* M-11: stage.ai.body sanitized via sanitize-html (inlineSchema). */}
                    <p
                      className="lf-hh-ai-body"
                      dangerouslySetInnerHTML={{ __html: sanitize(stage.ai.body, inlineSchema) }}
                    />
                  </div>
                ) : null}
                {stage.fork ? (
                  <div className="lf-hh-fork">
                    <div className="lf-hh-fork-label">{stage.fork.label}</div>
                    <div className="lf-hh-fork-options">
                      {stage.fork.options.map((o) => (
                        <div key={o.label} className="lf-hh-fork-opt" data-selected={!!o.selected}>
                          <span className="lf-hh-fork-radio" />
                          <span>{o.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="lf-hh-fork-note">{stage.fork.note}</p>
                  </div>
                ) : null}
                {stage.visibility ? (
                  <div className="lf-hh-vis">
                    <div className="lf-hh-vis-label">{stage.visibility.label}</div>
                    {stage.visibility.rows.map((r) => (
                      <div key={r.field} className="lf-hh-vis-row">
                        <strong>{r.field}</strong>
                        <span className={`lf-hh-vis-cls ${r.cls}`}>{r.clsLabel}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lf-hh-walk-dashes">
            <div className="lf-hh-dash-label">Three perspectives · click to follow</div>
            {(["corp", "scout", "applicant"] as Role[]).map((role) => {
              const state = stage.dashes[role];
              const meta = ROLE_META[role];
              return (
                <button
                  type="button"
                  key={role}
                  className="lf-hh-dash"
                  data-role={role}
                  data-active={!!state}
                  data-following={following === role}
                  onClick={() => follow(role)}
                >
                  <span className="lf-hh-dash-pulse" />
                  <div className="lf-hh-dash-head">
                    <div className="lf-hh-dash-icon">{meta.icon}</div>
                    <div>
                      <div className="lf-hh-dash-title">{meta.title}</div>
                      <div className="lf-hh-dash-sub">{meta.sub}</div>
                    </div>
                  </div>
                  <div className="lf-hh-dash-state">
                    {state ? (
                      <>
                        <span className="lf-hh-dash-state-stage">{state.stage}</span>
                        {state.msg}
                      </>
                    ) : (
                      <span className="lf-hh-dash-empty">{meta.empty}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}

const ROLE_META: Record<Role, { icon: string; title: string; sub: string; empty: string }> = {
  corp: { icon: "CO", title: "Corporate dashboard", sub: "The hiring manager", empty: "Awaiting action" },
  scout: { icon: "SC", title: "Scout dashboard", sub: "Network member", empty: "Not yet released" },
  applicant: { icon: "AP", title: "Applicant dashboard", sub: "Candidate view", empty: "No active application" },
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Outputs (3 deliverables)                                            */
/* ──────────────────────────────────────────────────────────────────── */
function Outputs() {
  return (
    <motion.section
      className="lf-hh-section"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <motion.div variants={fadeUp} className="lf-hh-section-kicker">
        § III · What clients receive
      </motion.div>
      <motion.h2 variants={fadeUp} className="lf-hh-section-title">
        Three outputs. <em>Three concrete deliverables.</em>
      </motion.h2>
      <motion.div variants={stagger} className="lf-hh-receives">
        {RECEIVES.map((r) => (
          <motion.div key={r.label} variants={fadeUp} className="lf-hh-receive-card">
            <div className="lf-hh-receive-label">{r.label}</div>
            <h3 className="lf-hh-receive-title">
              {r.titleLead}
              <em>{r.titleAccent}</em>
            </h3>
            <p className="lf-hh-receive-body">{r.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Commercial                                                          */
/* ──────────────────────────────────────────────────────────────────── */
function Commercial() {
  return (
    <motion.section
      className="lf-hh-section"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <div className="lf-hh-commercial">
        <div>
          <motion.div variants={fadeUp} className="lf-hh-section-kicker">
            Commercial terms
          </motion.div>
          <motion.h3 variants={fadeUp} className="lf-hh-section-title">
            Success fee only. <em>No retainer.</em>
          </motion.h3>
          <motion.div variants={fadeUp} className="lf-hh-commercial-body">
            <p>
              Tiered percentage of first-year compensation, paid only when a placement closes. Rates scale with
              role seniority. Specific terms are confirmed in writing before the mandate opens, no surprises, no
              escalation clauses.
            </p>
            <p>
              We don&apos;t charge upfront. We don&apos;t charge if we don&apos;t close.{" "}
              <strong>You pay when the hire joins.</strong>
            </p>
          </motion.div>
        </div>
        <motion.div variants={stagger} className="lf-hh-commercial-terms">
          {COMMERCIAL_TERMS.map((t) => (
            <motion.div key={t.label} variants={fadeUp} className="lf-hh-term">
              <span className="lf-hh-term-label">{t.label}</span>
              <span className="lf-hh-term-value">{t.value}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Scout section                                                       */
/* ──────────────────────────────────────────────────────────────────── */
function ScoutSection() {
  return (
    <motion.section
      className="lf-hh-scout"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <div className="lf-hh-scout-inner">
        <motion.div variants={fadeUp} className="lf-hh-scout-kicker">
          Scout Network · open for applications
        </motion.div>
        <motion.h2 variants={fadeUp} className="lf-hh-scout-title">
          If you have a network worth activating, <em>scout with LLP.</em>
        </motion.h2>
        <motion.p variants={fadeUp} className="lf-hh-scout-deck">
          Scouts are distributed talent connectors from every professional function. Finance people who know the
          CFOs. Supply chain people who know the operations heads. HR people who know the HR heads. Engineers,
          lawyers, marketers, designers, any discipline where your network is the asset.
        </motion.p>

        <motion.div variants={fadeUp} className="lf-hh-functions-label">
          Scouts currently active across
        </motion.div>
        <motion.div variants={stagger} className="lf-hh-functions">
          {FUNCTIONS.map((f) => (
            <motion.span variants={fadeUp} key={f} className="lf-hh-function">
              {f}
            </motion.span>
          ))}
        </motion.div>

        <motion.div variants={stagger} className="lf-hh-mechanics">
          {MECHANICS.map((m) => (
            <motion.div variants={fadeUp} key={m.label} className="lf-hh-mech">
              <div className="lf-hh-mech-label">{m.label}</div>
              <div className="lf-hh-mech-value">
                {m.value}
                <span className="sub">{m.sub}</span>
              </div>
              <p className="lf-hh-mech-desc">{m.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="lf-hh-reps-label">
          What scouting with LLP looks like
        </motion.div>
        <motion.div variants={stagger} className="lf-hh-reps">
          {REPS.map((r) => (
            <motion.div variants={fadeUp} key={r.fn} className="lf-hh-rep">
              <div className="lf-hh-rep-head">
                <div className="lf-hh-rep-avatar">{r.avatar}</div>
                <div className="lf-hh-rep-meta">
                  <div className="lf-hh-rep-fn">{r.fn}</div>
                  <div className="lf-hh-rep-where">{r.where}</div>
                </div>
              </div>
              <div className="lf-hh-rep-stat">
                <span className="v">{r.v}</span>
                <span className="l">{r.l}</span>
              </div>
              <p className="lf-hh-rep-note">{r.note}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.p variants={fadeUp} className="lf-hh-reps-foot">
          A reference of how scouting works with LLP. All ranges based on industry patterns and LLP&apos;s planned
          operating model. Specific outcomes depend on the mandate, your network, and timing.
        </motion.p>

        <motion.div variants={fadeUp}>
          <Link href={SCOUT_HREF} className="lf-hh-scout-cta">
            <span>Apply to the Scout Network</span>
            <Arrow />
          </Link>
          <div className="lf-hh-scout-meta">
            6 questions · ~3 minutes · Reviewed within 48 hours · Scope confirmed before activation
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Countries panel                                                     */
/* ──────────────────────────────────────────────────────────────────── */
function Countries() {
  const verified = COUNTRIES.reduce((acc, c) => acc + c.scouts, 0);
  return (
    <motion.section
      className="lf-hh-section"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <motion.div variants={fadeUp} className="lf-hh-section-kicker">
        Bangladesh-rooted. Cross-border by design.
      </motion.div>
      <motion.h2 variants={fadeUp} className="lf-hh-section-title">
        Seven countries. <em>Seventeen scouts verified.</em>
      </motion.h2>
      <motion.div variants={fadeUp} className="lf-hh-countries">
        <div className="lf-hh-countries-top">
          <div>
            <div className="lf-hh-section-kicker" style={{ marginBottom: 6 }}>
              Scouts joined from
            </div>
            <p
              style={{
                fontFamily: "var(--lf-display)",
                fontSize: 15,
                lineHeight: 1.6,
                color: "var(--ink-3)",
                margin: 0,
                maxWidth: 560,
              }}
            >
              Scouts apply, LLP admin reviews. On approval, the scout&apos;s country shows up here automatically.
              This is what the network growing looks like in public.
            </p>
          </div>
          <div className="lf-hh-countries-counter">
            <div className="lf-hh-countries-big">{verified}</div>
            <div className="lf-hh-countries-clabel">
              Verified scouts
              <br />
              across {ACTIVE_COUNTRIES.length} countries
            </div>
          </div>
        </div>
        <motion.div variants={stagger} className="lf-hh-countries-grid">
          {COUNTRIES.map((c) => (
            <motion.div
              variants={fadeUp}
              key={c.name}
              className="lf-hh-country"
              data-pending={c.pending || false}
            >
              <div className="lf-hh-country-head">
                <span className="lf-hh-country-flag" aria-hidden="true">
                  {c.flag}
                </span>
                <span className="lf-hh-country-name">{c.name}</span>
                {c.isNew ? <span className="lf-hh-country-new">New</span> : null}
              </div>
              <div className="lf-hh-country-meta">{c.functions}</div>
              <div className="lf-hh-country-stat">
                {c.pending ? (
                  "Awaiting first scout approval"
                ) : (
                  <>
                    <strong>{c.scouts}</strong> scout{c.scouts === 1 ? "" : "s"} · joined {c.addedWhen}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
        <div className="lf-hh-countries-foot">
          <span>
            Country list generated from <strong>admin-approved scout records</strong>. On approval, the
            scout&apos;s verified country appears. No manual hardcoding.
          </span>
          <span>
            Last updated · <strong>this week</strong>
          </span>
        </div>
      </motion.div>
    </motion.section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  FAQ                                                                 */
/* ──────────────────────────────────────────────────────────────────── */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <motion.section
      className="lf-hh-section"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <motion.div variants={fadeUp} className="lf-hh-section-kicker">
        Before getting started
      </motion.div>
      <motion.h2 variants={fadeUp} className="lf-hh-section-title">
        Questions we get <em>before getting started.</em>
      </motion.h2>
      <motion.div variants={fadeUp} className="lf-hh-faq">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="lf-hh-faq-item" data-open={isOpen}>
              <button
                type="button"
                className="lf-hh-faq-q"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span>{item.q}</span>
                <ChevronIcon />
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    key="answer"
                    className="lf-hh-faq-a"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1, transition: { duration: 0.32, ease: EASE_OUT } }}
                    exit={{ height: 0, opacity: 0, transition: { duration: 0.22 } }}
                  >
                    <p>{item.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Final CTA                                                           */
/* ──────────────────────────────────────────────────────────────────── */
function FinalCta() {
  return (
    <motion.section
      className="lf-final lf-hh-final"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <div className="lf-final-inner">
        <motion.h2 variants={fadeUp} className="lf-final-title">
          Ready to start the <em>hiring conversation?</em>
        </motion.h2>
        <motion.p variants={fadeUp} className="lf-final-deck">
          Early access is open for employers, scouts, and partner firms who want to work through a more structured
          headhunting model.
        </motion.p>
        <motion.div variants={fadeUp} className="lf-hh-final-cta-row">
          <Link href={HIRING_HREF} className="lf-hh-cta-primary">
            <span>Request hiring support</span>
            <Arrow />
          </Link>
          <Link href={SCOUT_HREF} className="lf-hh-cta-secondary">
            Join the scout network
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Icons                                                               */
/* ──────────────────────────────────────────────────────────────────── */
function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lf-hh-faq-chevron" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
