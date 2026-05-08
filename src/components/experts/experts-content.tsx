"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useQuery } from "convex/react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileText,
  Lock,
  Pencil,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { ConsultationRequestDialog } from "@/components/experts/consultation-request-dialog";
import { ExpertSelfEditSheet } from "@/components/experts/expert-self-edit-sheet";
import { useLanguage } from "@/hooks/use-language";
import { useAccountType } from "@/components/providers/account-context";
import { cn } from "@/lib/utils";
import "@/components/landing/landing.css";

/* ───────────────── Motion ───────────────── */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const inViewOnce = { once: true, margin: "-72px 0px" } as const;

/* ───────────────── Static data ───────────────── */

const KNOWN_DOMAINS: Record<string, string> = {
  "brac": "brac.net",
  "unilever": "unilever.com",
  "grameenphone": "grameenphone.com",
  "beximco": "beximco.com",
  "walton": "waltonbd.com",
  "berger": "bergerpaints.com",
  "square": "squaregroup.com.bd",
  "dbl": "dblgroup.com",
  "sheltech": "sheltech.net",
  "bti": "btibd.com",
  "concord": "concordbd.com",
  "edra": "edra.com.bd",
  "labor law partner": "laborlawpartner.com",
  "llp": "laborlawpartner.com",
};

const steps = [
  { num: "I",   titleKey: "experts.how.step1.title", descKey: "experts.how.step1.desc", icon: Search },
  { num: "II",  titleKey: "experts.how.step2.title", descKey: "experts.how.step2.desc", icon: UserCheck },
  { num: "III", titleKey: "experts.how.step3.title", descKey: "experts.how.step3.desc", icon: CalendarCheck },
  { num: "IV",  titleKey: "experts.how.step4.title", descKey: "experts.how.step4.desc", icon: ClipboardCheck },
];

const standards = [
  { titleKey: "experts.standards.s1.title", descKey: "experts.standards.s1.desc", icon: ShieldCheck },
  { titleKey: "experts.standards.s2.title", descKey: "experts.standards.s2.desc", icon: Lock },
  { titleKey: "experts.standards.s3.title", descKey: "experts.standards.s3.desc", icon: Scale },
];

const pillars = [
  {
    titleKey: "experts.pillars.p1.title",
    descKey: "experts.pillars.p1.desc",
    icon: ShieldCheck,
    highlights: ["experts.pillars.p1.h1", "experts.pillars.p1.h2", "experts.pillars.p1.h3"],
  },
  {
    titleKey: "experts.pillars.p2.title",
    descKey: "experts.pillars.p2.desc",
    icon: Search,
    highlights: ["experts.pillars.p2.h1", "experts.pillars.p2.h2", "experts.pillars.p2.h3"],
  },
  {
    titleKey: "experts.pillars.p3.title",
    descKey: "experts.pillars.p3.desc",
    icon: FileText,
    highlights: ["experts.pillars.p3.h1", "experts.pillars.p3.h2", "experts.pillars.p3.h3"],
  },
];

const availabilityConfig: Record<
  string,
  { tone: "live" | "busy" | "off"; labelKey: string }
> = {
  available: { tone: "live", labelKey: "experts.card.available" },
  busy: { tone: "busy", labelKey: "experts.card.busy" },
  on_leave: { tone: "off", labelKey: "experts.card.onLeave" },
};

/* ───────────────── Helpers ───────────────── */

function guessCompanyDomain(name: string): string | null {
  const cleaned = name
    .toLowerCase()
    .replace(
      /\b(limited|ltd|pvt|private|inc|corp|co|llc|group|bangladesh|bd|services|solutions|developments|development|real estate|building|technology|ideas|products|company)\b/g,
      ""
    )
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!cleaned.length) return null;
  return cleaned.slice(0, 2).join("") + ".com";
}

function getCompanyLogoUrl(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, domain] of Object.entries(KNOWN_DOMAINS)) {
    if (lower.includes(key)) return `https://logo.clearbit.com/${domain}`;
  }
  const guessed = guessCompanyDomain(name);
  if (guessed) return `https://logo.clearbit.com/${guessed}`;
  return "";
}

const extractCountry = (city: string): string => {
  const parts = city.split(/[,|]/).map((p) => p.trim());
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

const nameToColor = (name: string): string => {
  const colors = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

/* ───────────────── MultiSelect ───────────────── */

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <span className="lf-field-label">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="lf-select-trigger"
        data-placeholder={selected.length === 0}
      >
        <span className="truncate">
          {selected.length === 0 ? placeholder : selected.join(", ")}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: "var(--ink-4)" }}
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="lf-dropdown">
            {options.length === 0 ? (
              <div
                style={{
                  padding: "10px 12px",
                  fontFamily: "var(--lf-mono)",
                  fontSize: 11,
                  color: "var(--ink-5)",
                }}
              >
                —
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className="lf-dropdown-item"
                    onClick={() => {
                      onChange(
                        isSelected
                          ? selected.filter((s) => s !== opt)
                          : [...selected, opt]
                      );
                    }}
                  >
                    <span className={cn("lf-check", isSelected && "lf-check--on")}>
                      {isSelected && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{opt}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────── CompanyLogoBadge + CredibilityBar (preserved) ───────── */

function CompanyLogoBadge({
  name,
  initials,
  color,
}: {
  name: string;
  initials: string;
  color: string;
}) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getCompanyLogoUrl(name);
  const showLogo = !imgError && logoUrl;

  return (
    <span
      title={name}
      className="lf-tag inline-flex shrink-0 items-center gap-1.5"
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          className="h-4 w-4 object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="flex h-4 w-4 items-center justify-center text-[7px] font-bold text-white shrink-0"
          style={{ backgroundColor: color, borderRadius: 2 }}
        >
          {initials}
        </span>
      )}
      <span>{name}</span>
    </span>
  );
}

function CredibilityBar({
  label,
  children,
  count,
}: {
  label: string;
  children: React.ReactNode;
  count: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const ROW_HEIGHT = 32;
  const MAX_ROWS = 3;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span className="lf-field-label" style={{ marginBottom: 0 }}>
          {label}
        </span>
        {count > 6 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="lf-clear-btn"
            style={{ padding: "4px 10px", fontSize: 9.5 }}
          >
            {expanded ? "Fold" : "See all"}
          </button>
        )}
      </div>
      <div
        className={expanded ? "" : "overflow-hidden"}
        style={expanded ? {} : { maxHeight: `${ROW_HEIGHT * MAX_ROWS}px` }}
      >
        <div className="flex flex-wrap gap-1.5">{children}</div>
      </div>
    </div>
  );
}

/* ───────────────── Main ───────────────── */

export function ExpertsContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const { t } = useLanguage();
  const { user } = useUser();
  const { isOrgUser } = useAccountType();

  const experts = useQuery(api.experts.listPublished, {});
  const myExpert = useQuery(
    api.experts.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );
  const existingApplication = useQuery(
    api.expertApplications.getByApplicant,
    user?.id ? { applicantClerkId: user.id } : "skip"
  );
  const isLoading = experts === undefined;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [selfEditOpen, setSelfEditOpen] = useState(false);

  const allSectors = useMemo(() => {
    if (!experts) return [];
    const set = new Set<string>();
    for (const e of experts) e.sectors.forEach((s) => set.add(s));
    return Array.from(set).sort();
  }, [experts]);

  const allSkills = useMemo(() => {
    if (!experts) return [];
    const set = new Set<string>();
    for (const e of experts) e.skills.forEach((s) => set.add(s.name));
    return Array.from(set).sort();
  }, [experts]);

  const allCompanies = useMemo(() => {
    if (!experts)
      return [] as { name: string; initials: string; color: string }[];
    const seen = new Set<string>();
    const result: { name: string; initials: string; color: string }[] = [];
    const addCompany = (name: string, initials?: string, color?: string) => {
      const key = name.trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      const ini =
        initials ||
        key
          .split(/\s+/)
          .map((w: string) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
      result.push({ name: key, initials: ini, color: color || nameToColor(key) });
    };
    for (const e of experts) {
      for (const c of e.companiesWorked)
        addCompany(c.name, c.initials, c.color);
      if (e.organization) addCompany(e.organization);
      for (const exp of e.experiences) {
        if (exp.company) addCompany(exp.company);
      }
    }
    const hasKnownDomain = (name: string) => {
      const lower = name.toLowerCase();
      return Object.keys(KNOWN_DOMAINS).some((key) => lower.includes(key));
    };
    return result.sort((a, b) => {
      const aKnown = hasKnownDomain(a.name);
      const bKnown = hasKnownDomain(b.name);
      if (aKnown && !bKnown) return -1;
      if (!aKnown && bKnown) return 1;
      return 0;
    });
  }, [experts]);

  const allCountries = useMemo(() => {
    if (!experts) return [] as string[];
    const set = new Set<string>();
    for (const e of experts) {
      for (const c of e.countriesWorked) if (c) set.add(c);
      const parsed = extractCountry(e.city);
      if (parsed) set.add(parsed);
    }
    return Array.from(set);
  }, [experts]);

  const filteredExperts = useMemo(() => {
    if (!experts) return [];
    return experts.filter((e) => {
      if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedSectors.length && !e.sectors.some((s) => selectedSectors.includes(s))) return false;
      if (selectedSkills.length && !e.skills.some((s) => selectedSkills.includes(s.name))) return false;
      if (showAvailableOnly && e.availabilityStatus !== "available") return false;
      return true;
    });
  }, [experts, searchQuery, selectedSectors, selectedSkills, showAvailableOnly]);

  const hasActiveFilters =
    !!searchQuery ||
    selectedSectors.length > 0 ||
    selectedSkills.length > 0 ||
    showAvailableOnly;

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function clearAllFilters() {
    setSearchQuery("");
    setSelectedSectors([]);
    setSelectedSkills([]);
    setShowAvailableOnly(false);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />

        <main>
          {/* ─── § I · Hero ─────────────────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ I</span>The Directory
              </motion.div>
            </motion.div>

            <div className="grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-stretch">
              <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.div
                  variants={fadeUp}
                  className="inline-flex items-center gap-2"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    background:
                      "color-mix(in oklab, var(--accent-blue) 8%, transparent)",
                    border:
                      "1px solid color-mix(in oklab, var(--accent-blue) 22%, transparent)",
                  }}
                >
                  <Sparkles
                    className="size-3"
                    style={{ color: "var(--accent-blue)" }}
                  />
                  <span className="lf-meta lf-meta--accent" style={{ fontSize: 9.5 }}>
                    {t("experts.hero.badge")}
                  </span>
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  className="lf-h2"
                  style={{
                    marginTop: 22,
                    fontSize: "clamp(36px, 4.6vw, 56px)",
                    maxWidth: "18ch",
                  }}
                >
                  {t("experts.hero.headline")}
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="lf-section-deck"
                  style={{ marginTop: 18, maxWidth: "56ch" }}
                >
                  {t("experts.hero.subline")}
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2"
                  style={{ marginTop: 26 }}
                >
                  <span
                    className="lf-meta inline-flex items-center gap-1.5"
                    style={{ fontSize: 10 }}
                  >
                    <ShieldCheck
                      className="size-3.5"
                      style={{ color: "var(--emerald)" }}
                    />
                    Verified practitioners
                  </span>
                  <span className="lf-meta lf-meta--accent" style={{ fontSize: 14 }}>
                    §
                  </span>
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    Cross-functional coverage
                  </span>
                  <span className="lf-meta lf-meta--accent" style={{ fontSize: 14 }}>
                    §
                  </span>
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    Bangladesh-focused, globally connected
                  </span>
                </motion.div>

                <motion.div
                  variants={fadeUp}
                  className="flex flex-wrap items-center gap-3"
                  style={{ marginTop: 32 }}
                >
                  <a
                    href="#directory"
                    className="lf-cta lf-cta--primary lf-glow group"
                  >
                    <span>{t("experts.hero.ctaBrowse")}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </a>
                  {!isOrgUser && (
                    <Link
                      href="/experts/apply"
                      className="lf-cta lf-cta--ghost lf-glow"
                    >
                      <UserCheck className="size-4" />
                      <span>{t("experts.paths.professionals.title")}</span>
                    </Link>
                  )}
                </motion.div>
              </motion.div>

              {/* Right registry panel */}
              <motion.aside
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="lf-card lf-card--feature flex flex-col"
              >
                <div
                  className="flex items-center gap-3"
                  style={{
                    paddingBottom: 14,
                    borderBottom: "1px solid var(--line-1)",
                  }}
                >
                  <span className="lf-meta lf-meta--accent">N° 01</span>
                  <span className="lf-h3" style={{ fontSize: 17 }}>
                    Registry
                  </span>
                </div>

                <div className="flex flex-col flex-1" style={{ paddingTop: 18 }}>
                  <div className="lf-status lf-status--live inline-flex self-start">
                    <span className="lf-status-dot" />
                    <span>Current intake · rolling review</span>
                  </div>

                  <div style={{ marginTop: 22 }}>
                    <div
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontStyle: "italic",
                        fontSize: "clamp(48px, 5vw, 72px)",
                        lineHeight: 1,
                        color: "var(--accent-blue)",
                        fontVariationSettings: '"opsz" 96, "SOFT" 100',
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {isLoading ? "—" : String(experts?.length ?? 0).padStart(2, "0")}
                    </div>
                    <div className="lf-meta" style={{ marginTop: 6 }}>
                      Practitioners on record
                    </div>
                  </div>

                  <hr className="lf-rule" style={{ margin: "20px 0" }} />

                  <ul className="lf-runlist" style={{ fontSize: 13 }}>
                    {[
                      "Assessed & admitted by Labor Law Partner",
                      "Evidence-grounded practice areas",
                      "Booking & advisory, session-by-session",
                    ].map((line) => (
                      <li key={line} style={{ padding: "8px 0" }}>
                        <Check
                          className="size-3.5 shrink-0"
                          style={{ color: "var(--emerald)", marginTop: 4 }}
                        />
                        <span className="lf-runlist-text" style={{ fontSize: 13 }}>
                          {line}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div
                    className="grid grid-cols-3 gap-3"
                    style={{
                      marginTop: "auto",
                      paddingTop: 22,
                      borderTop: "1px solid var(--line-1)",
                    }}
                  >
                    {[
                      { num: "12+", label: "Practice areas" },
                      { num: "EN · BN", label: "Languages" },
                      { num: "≤ 24h", label: "First reply" },
                    ].map((m) => (
                      <div key={m.label}>
                        <div
                          style={{
                            fontFamily: "var(--lf-display)",
                            fontWeight: 500,
                            fontSize: 18,
                            color: "var(--ink)",
                            lineHeight: 1.1,
                          }}
                        >
                          {m.num}
                        </div>
                        <div
                          className="lf-meta"
                          style={{ marginTop: 4, fontSize: 9 }}
                        >
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="lf-meta"
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: "1px solid var(--line-1)",
                    fontSize: 9.5,
                  }}
                >
                  Updated live · Bangladesh
                </div>
              </motion.aside>
            </div>
          </section>

          {/* Application status banner */}
          {existingApplication && (
            <section className="lf-section" style={{ paddingTop: 0 }}>
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
                className="lf-card flex flex-wrap items-center gap-3"
              >
                {existingApplication.status === "approved" ? (
                  <CheckCircle
                    className="size-5"
                    style={{ color: "var(--emerald)" }}
                  />
                ) : existingApplication.status === "rejected" ? (
                  <XCircle className="size-5" style={{ color: "var(--bronze)" }} />
                ) : (
                  <Clock
                    className="size-5"
                    style={{ color: "var(--accent-blue)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="lf-h3" style={{ fontSize: 15 }}>
                    {t(`experts.application.status.${existingApplication.status}`)}
                  </div>
                </div>
                <Link
                  href="/experts/apply"
                  className="lf-cta lf-cta--ghost lf-glow"
                  style={{ fontSize: 10.5 }}
                >
                  {t("experts.application.viewApplication")}
                </Link>
              </motion.div>
            </section>
          )}

          {/* ─── § II · Directory + Filters + Grid ──────────────────── */}
          <section id="directory" className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ II</span>The Directory
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-h2">
                {t("experts.directory.title") || "Browse practitioners"}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 10, maxWidth: "60ch" }}
              >
                {t("experts.directory.subtitle") ||
                  "Search by practice, sector, or availability — every entry vetted by the LLP desk."}
              </motion.p>
            </motion.div>

            {/* Filters */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
              className="lf-card lf-card--feature"
              style={{ padding: "var(--s-4)" }}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <span className="lf-field-label">
                    {t("experts.directory.searchLabel")}
                  </span>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4"
                      style={{ color: "var(--ink-4)" }}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("experts.filter.search")}
                      className="lf-input"
                      style={{ paddingLeft: 38, paddingRight: 36 }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{
                          color: "var(--ink-4)",
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                        }}
                        aria-label="Clear search"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <MultiSelect
                  label={t("experts.filter.sector")}
                  options={allSectors}
                  selected={selectedSectors}
                  onChange={setSelectedSectors}
                  placeholder={t("experts.filter.allSectors")}
                />

                <MultiSelect
                  label={t("experts.filter.skill")}
                  options={allSkills}
                  selected={selectedSkills}
                  onChange={setSelectedSkills}
                  placeholder={t("experts.filter.allSkills")}
                />

                <div className="flex flex-col justify-end gap-3">
                  <label className="flex cursor-pointer select-none items-center gap-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showAvailableOnly}
                      onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                      className={cn("lf-toggle", showAvailableOnly && "lf-toggle--on")}
                    >
                      <span className="lf-toggle-knob" />
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--lf-body)",
                        fontSize: 12.5,
                        color: "var(--ink-2)",
                      }}
                    >
                      {t("experts.filter.available")}
                    </span>
                  </label>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="lf-clear-btn self-start"
                    >
                      <X className="size-3" />
                      {t("experts.filter.clearAll")}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Grid */}
            <div style={{ marginTop: "var(--s-5)" }}>
              {isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ExpertSkeleton key={i} />
                  ))}
                </div>
              ) : filteredExperts.length === 0 ? (
                <EmptyState
                  hasActiveFilters={hasActiveFilters}
                  onClear={clearAllFilters}
                  t={t}
                />
              ) : (
                <motion.div
                  className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                  variants={stagger}
                  initial="hidden"
                  whileInView="show"
                  viewport={inViewOnce}
                >
                  {filteredExperts.map((expert, index) => {
                    const avail =
                      availabilityConfig[expert.availabilityStatus] ||
                      availabilityConfig.available;
                    const topSkills = expert.skills.slice(0, 3);
                    const extraSkillCount = expert.skills.length - 3;
                    const topSectors = expert.sectors.slice(0, 3);
                    const extraSectorCount = expert.sectors.length - 3;
                    const isComparing = compareIds.includes(expert._id);
                    const folioNum = String(index + 1).padStart(3, "0");

                    return (
                      <motion.article
                        key={expert._id}
                        variants={fadeUp}
                        className="lf-card lf-card--hover"
                        style={
                          isComparing
                            ? {
                                borderColor:
                                  "color-mix(in oklab, var(--accent-blue) 50%, var(--glass-border))",
                                boxShadow:
                                  "inset 0 1px 0 rgba(255,255,255,0.5), 0 18px 48px -16px color-mix(in oklab, var(--accent-blue) 32%, rgba(15,23,42,0.22))",
                              }
                            : undefined
                        }
                      >
                        {/* Folio header */}
                        <div className="flex items-center justify-between">
                          <span className="lf-meta lf-meta--accent">
                            N° {folioNum}
                          </span>
                          <div
                            className={cn("lf-status", `lf-status--${avail.tone}`)}
                          >
                            <span className="lf-status-dot" />
                            <span>{t(avail.labelKey)}</span>
                          </div>
                        </div>

                        {expert.isFeatured && (
                          <span
                            className="inline-flex items-center gap-1.5"
                            style={{
                              marginTop: 12,
                              padding: "3px 10px",
                              borderRadius: 999,
                              background:
                                "color-mix(in oklab, var(--bronze) 12%, transparent)",
                              border:
                                "1px solid color-mix(in oklab, var(--bronze) 26%, transparent)",
                              fontFamily: "var(--lf-mono)",
                              fontSize: 9.5,
                              letterSpacing: "0.18em",
                              textTransform: "uppercase",
                              fontWeight: 600,
                              color: "var(--bronze)",
                            }}
                          >
                            <Star className="size-2.5 fill-current" />
                            {t("experts.card.featured")}
                          </span>
                        )}

                        {/* Identity */}
                        <div
                          className="flex items-start gap-3"
                          style={{ marginTop: 16 }}
                        >
                          <Link
                            href={`/experts/${expert.slug}`}
                            className="flex min-w-0 flex-1 items-start gap-3"
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            {expert.profilePhotoUrl ? (
                              <span className="lf-avatar shrink-0">
                                <Image
                                  src={expert.profilePhotoUrl}
                                  alt={expert.name}
                                  width={52}
                                  height={52}
                                  referrerPolicy="no-referrer"
                                />
                              </span>
                            ) : (
                              <span className="lf-avatar shrink-0">
                                {expert.initials}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div
                                className="truncate"
                                style={{
                                  fontFamily: "var(--lf-display)",
                                  fontSize: 17,
                                  fontWeight: 500,
                                  color: "var(--ink)",
                                  lineHeight: 1.25,
                                }}
                              >
                                {expert.name}
                              </div>
                              <div
                                className="truncate"
                                style={{
                                  marginTop: 2,
                                  fontFamily: "var(--lf-body)",
                                  fontSize: 12.5,
                                  color: "var(--ink-3)",
                                }}
                              >
                                {expert.designation}
                              </div>
                            </div>
                          </Link>

                          {myExpert && myExpert._id === expert._id && (
                            <button
                              type="button"
                              onClick={() => setSelfEditOpen(true)}
                              className="lf-icon-btn shrink-0"
                              title={t("profile.editProfile")}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Skill ledger */}
                        <div style={{ marginTop: 18 }}>
                          <span className="lf-field-label">Practice</span>
                          <div className="flex flex-wrap gap-1.5">
                            {topSkills.map((skill) => (
                              <span key={skill.name} className="lf-tag lf-tag--skill">
                                <span>{skill.name}</span>
                                <span className="lf-tag-suffix">{skill.level}</span>
                              </span>
                            ))}
                            {extraSkillCount > 0 && (
                              <span className="lf-tag lf-tag--more">
                                {t("experts.card.moreSkills").replace(
                                  "{n}",
                                  String(extraSkillCount)
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sector ledger */}
                        <div style={{ marginTop: 14 }}>
                          <span className="lf-field-label">Sector</span>
                          <div className="flex flex-wrap gap-1.5">
                            {topSectors.map((sector) => (
                              <span key={sector} className="lf-tag lf-tag--sector">
                                {sector}
                              </span>
                            ))}
                            {extraSectorCount > 0 && (
                              <span className="lf-tag lf-tag--more">
                                +{extraSectorCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        <div
                          className="flex items-center justify-between gap-3"
                          style={{
                            marginTop: 18,
                            paddingTop: 14,
                            borderTop: "1px solid var(--line-1)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="lf-stars">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "size-3",
                                    i < Math.round(expert.stats.rating)
                                      ? "lf-star--on"
                                      : "lf-star--off"
                                  )}
                                />
                              ))}
                            </div>
                            <span
                              style={{
                                fontFamily: "var(--lf-mono)",
                                fontSize: 10,
                                letterSpacing: "0.06em",
                                color: "var(--ink-4)",
                              }}
                            >
                              {expert.stats.rating.toFixed(1)} ·{" "}
                              {expert.stats.reviewCount}{" "}
                              {t("experts.card.reviews")}
                            </span>
                          </div>

                          <label
                            className="inline-flex items-center gap-2 cursor-pointer"
                            style={{
                              fontFamily: "var(--lf-mono)",
                              fontSize: 9.5,
                              letterSpacing: "0.18em",
                              textTransform: "uppercase",
                              color: "var(--ink-3)",
                              fontWeight: 500,
                            }}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isComparing}
                              onChange={() => toggleCompare(expert._id)}
                              disabled={!isComparing && compareIds.length >= 3}
                            />
                            <span
                              className={cn(
                                "lf-check",
                                isComparing && "lf-check--on"
                              )}
                            >
                              {isComparing && <Check className="size-3" />}
                            </span>
                            <span>{t("experts.card.compare")}</span>
                          </label>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </section>

          {/* ─── § III · How it works ───────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ III</span>How it works
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-h2">
                {t("experts.how.title")}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 10, maxWidth: "60ch" }}
              >
                {t("experts.how.subtitle")}
              </motion.p>
            </motion.div>

            <motion.div
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {steps.map(({ num, titleKey, descKey, icon: Icon }) => (
                <motion.div
                  key={num}
                  variants={fadeUp}
                  className="lf-card lf-card--hover"
                >
                  <div className="flex items-start justify-between">
                    <span className="lf-meta lf-meta--accent">CH. {num}</span>
                    <Icon className="size-5" style={{ color: "var(--ink-4)" }} />
                  </div>
                  <h3 className="lf-h3" style={{ marginTop: 22 }}>
                    {t(titleKey)}
                  </h3>
                  <p className="lf-body" style={{ marginTop: 8 }}>
                    {t(descKey)}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── § IV · Foundations / Pillars ───────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ IV</span>Foundations
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-h2">
                {t("experts.pillars.title")}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 10, maxWidth: "60ch" }}
              >
                {t("experts.pillars.subtitle")}
              </motion.p>
            </motion.div>

            <motion.div
              className="grid gap-5 md:grid-cols-3"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {pillars.map(({ titleKey, descKey, icon: Icon, highlights }, i) => (
                <motion.div
                  key={titleKey}
                  variants={fadeUp}
                  className="lf-card lf-card--hover"
                >
                  <div className="flex items-center justify-between">
                    <span className="lf-meta lf-meta--accent">
                      P. {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="inline-flex items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--r-md)",
                        background:
                          "color-mix(in oklab, var(--accent-blue) 12%, transparent)",
                        border:
                          "1px solid color-mix(in oklab, var(--accent-blue) 24%, transparent)",
                        color: "var(--accent-blue)",
                      }}
                    >
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <h3 className="lf-h3" style={{ marginTop: 18 }}>
                    {t(titleKey)}
                  </h3>
                  <p className="lf-body" style={{ marginTop: 8 }}>
                    {t(descKey)}
                  </p>
                  <ul className="lf-runlist" style={{ marginTop: 18 }}>
                    {highlights.map((hk) => (
                      <li key={hk}>
                        <Check
                          className="size-3.5 shrink-0"
                          style={{ color: "var(--emerald)", marginTop: 4 }}
                        />
                        <span
                          className="lf-runlist-text"
                          style={{ fontSize: 13.5 }}
                        >
                          {t(hk)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── § V · Standards ────────────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ V</span>Editorial standards
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-h2">
                {t("experts.standards.title")}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 10, maxWidth: "60ch" }}
              >
                {t("experts.standards.subtitle")}
              </motion.p>
            </motion.div>

            <motion.div
              className="grid gap-5 md:grid-cols-3"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {standards.map(({ titleKey, descKey, icon: Icon }, i) => (
                <motion.div
                  key={titleKey}
                  variants={fadeUp}
                  className="lf-card lf-card--hover"
                >
                  <div className="flex items-center gap-3">
                    <span className="lf-meta lf-meta--accent">
                      § {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon
                      className="size-4"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </div>
                  <h3 className="lf-h3" style={{ marginTop: 18 }}>
                    {t(titleKey)}
                  </h3>
                  <p className="lf-body" style={{ marginTop: 8 }}>
                    {t(descKey)}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── § VI · CTA Band ────────────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
              className="lf-card lf-card--feature"
              style={{
                position: "relative",
                overflow: "hidden",
                padding: "clamp(28px, 4vw, 56px)",
                textAlign: "center",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: `
                    radial-gradient(ellipse 60% 50% at 18% 25%, color-mix(in oklab, var(--accent-blue) 22%, transparent) 0%, transparent 60%),
                    radial-gradient(ellipse 55% 45% at 82% 80%, color-mix(in oklab, var(--bronze) 14%, transparent) 0%, transparent 55%)
                  `,
                }}
              />
              <div style={{ position: "relative" }}>
                <div
                  className="lf-section-eyebrow"
                  style={{ justifyContent: "center" }}
                >
                  <span className="lf-section-eyebrow-rule" />
                  <span className="lf-meta lf-meta--accent">§ VI</span>
                  <span className="lf-meta">Begin</span>
                </div>
                <h2
                  className="lf-h2"
                  style={{ maxWidth: "22ch", marginInline: "auto" }}
                >
                  {t("experts.cta.headline")}
                </h2>
                <p
                  className="lf-section-deck mx-auto"
                  style={{ marginTop: 14, maxWidth: "56ch" }}
                >
                  {t("experts.cta.subline")}
                </p>
                <div
                  className="flex flex-wrap items-center justify-center gap-3"
                  style={{ marginTop: 28 }}
                >
                  <Link
                    href="/sign-in"
                    className="lf-cta lf-cta--primary lf-glow group"
                  >
                    <span>{t("home.hero.ctaPrimary")}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/documents"
                    className="lf-cta lf-cta--ghost lf-glow"
                  >
                    {t("home.hero.ctaSecondary")}
                  </Link>
                </div>
              </div>
            </motion.div>
          </section>
        </main>

        <HomepageFooter />

        {/* Dialogs */}
        <ConsultationRequestDialog
          open={consultationOpen}
          onOpenChange={setConsultationOpen}
        />

        {/* Floating compare dock */}
        {compareIds.length >= 2 && (
          <div className="fixed bottom-20 right-4 z-50 sm:bottom-6 sm:right-6">
            <Link
              href={`/experts/compare?ids=${compareIds.join(",")}`}
              className="lf-compare-dock group"
            >
              <span className="lf-compare-dock-num">{compareIds.length}</span>
              <span>{t("experts.compare.button")}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}

        {myExpert && user?.id && (
          <ExpertSelfEditSheet
            open={selfEditOpen}
            onOpenChange={setSelfEditOpen}
            expertId={myExpert._id}
            clerkId={user.id}
          />
        )}
      </div>
    </MotionConfig>
  );
}

/* ───────────────── Skeleton + Empty ───────────────── */

function ExpertSkeleton() {
  return (
    <div className="lf-card animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-16" style={{ background: "var(--line-2)" }} />
        <div
          className="h-5 w-20"
          style={{ background: "var(--line-1)", borderRadius: 999 }}
        />
      </div>
      <div className="flex items-center gap-3" style={{ marginTop: 18 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            background: "var(--line-1)",
            flexShrink: 0,
          }}
        />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4" style={{ background: "var(--line-2)" }} />
          <div className="h-3 w-1/2" style={{ background: "var(--line-1)" }} />
        </div>
      </div>
      <div className="space-y-2" style={{ marginTop: 18 }}>
        <div className="h-3 w-1/3" style={{ background: "var(--line-1)" }} />
        <div className="flex gap-1.5">
          <div
            className="h-5 w-16"
            style={{ background: "var(--line-1)", borderRadius: 999 }}
          />
          <div
            className="h-5 w-20"
            style={{ background: "var(--line-1)", borderRadius: 999 }}
          />
          <div
            className="h-5 w-14"
            style={{ background: "var(--line-1)", borderRadius: 999 }}
          />
        </div>
      </div>
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid var(--line-1)",
        }}
      >
        <div className="h-3 w-24" style={{ background: "var(--line-1)" }} />
        <div className="h-3 w-16" style={{ background: "var(--line-1)" }} />
      </div>
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  onClear,
  t,
}: {
  hasActiveFilters: boolean;
  onClear: () => void;
  t: (k: string) => string;
}) {
  return (
    <div
      className="lf-card text-center"
      style={{
        padding: "clamp(40px, 6vw, 72px) 24px",
        borderStyle: "dashed",
      }}
    >
      <Users
        className="size-10 mx-auto"
        style={{ color: "var(--ink-5)", marginBottom: 14 }}
      />
      <p className="lf-body mx-auto" style={{ maxWidth: 480 }}>
        {hasActiveFilters
          ? t("experts.filter.noResults")
          : t("experts.directory.comingSoonDesc")}
      </p>
      <div className="flex justify-center" style={{ marginTop: 20 }}>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="lf-cta lf-cta--ghost lf-glow"
          >
            {t("experts.filter.clearAll")}
          </button>
        ) : (
          <Link href="/sign-in" className="lf-cta lf-cta--ghost lf-glow group">
            <span>{t("experts.directory.tryAiFirst")}</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
