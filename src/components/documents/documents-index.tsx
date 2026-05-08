"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Calendar,
  FileText,
  GitBranch,
  Globe,
  Scale,
  Search,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import type { DocumentMeta, SupersessionChain } from "@/lib/documents";
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

/* ───────────────── Types & helpers ───────────────── */

type FilterType = "all" | "acts" | "amendments" | "rules" | "ordinances";

const filterConfig: { key: FilterType; labelKey: string }[] = [
  { key: "all", labelKey: "docs.filterAll" },
  { key: "acts", labelKey: "docs.filterActs" },
  { key: "amendments", labelKey: "docs.filterAmendments" },
  { key: "rules", labelKey: "docs.filterRules" },
  { key: "ordinances", labelKey: "docs.filterOrdinances" },
];

// Tone keyed by instrument_type — maps to the lf-* token vocabulary
const toneFor: Record<string, "accent-blue" | "bronze" | "emerald" | "rust"> = {
  Act: "accent-blue",
  "Amendment Act": "bronze",
  Rules: "emerald",
  "Amendment Rules": "emerald",
  Ordinance: "rust",
};

function matchesFilter(doc: DocumentMeta, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "acts") return doc.instrument_type === "Act";
  if (filter === "amendments")
    return (
      doc.instrument_type === "Amendment Act" ||
      doc.instrument_type === "Amendment Rules"
    );
  if (filter === "rules") return doc.instrument_type === "Rules";
  if (filter === "ordinances") return doc.instrument_type === "Ordinance";
  return true;
}

interface TranslationFlags {
  enTranslated?: boolean;
  bnTranslated?: boolean;
}

interface DocumentsIndexProps {
  documents: DocumentMeta[];
  chains: SupersessionChain[];
  translationFlags?: Record<string, TranslationFlags>;
}

/* ───────────────── Main ───────────────── */

export function DocumentsIndex({
  documents,
  chains,
  translationFlags,
}: DocumentsIndexProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (!matchesFilter(doc, activeFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.instrument_type.toLowerCase().includes(q) ||
          doc.date_enacted.includes(q) ||
          doc.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, searchQuery, activeFilter]);

  const parents = filtered.filter((d) => d.is_parent);
  const amendments = filtered.filter((d) => !d.is_parent);

  // Stats computed from all documents (not filtered)
  const totalPages = documents.reduce((sum, d) => sum + d.pages, 0);
  const primaryCount = documents.filter((d) => d.is_parent).length;
  const amendmentCount = documents.filter((d) => !d.is_parent).length;

  const stats = [
    { value: documents.length, label: t("docs.statDocuments") },
    { value: primaryCount, label: t("docs.statPrimaryActs") },
    { value: amendmentCount, label: t("docs.statAmendments") },
    { value: totalPages, label: t("docs.statTotalPages") },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />

        <main>
          {/* ─── § I · Masthead ─────────────────────────────────────── */}
          <section className="lf-section" style={{ paddingTop: "calc(var(--s-7) + 48px)" }}>
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ I</span>
                {t("docs.heroBadge")}
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="lf-h2"
                style={{
                  fontSize: "clamp(36px, 4.6vw, 56px)",
                  maxWidth: "20ch",
                }}
              >
                {t("docs.heroTitle")}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 18, maxWidth: "58ch" }}
              >
                {t("docs.heroSubtitle")}
              </motion.p>
            </motion.div>

            {/* Stats — 4 glass tiles */}
            <motion.div
              className="grid gap-4 grid-cols-2 md:grid-cols-4"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  className="lf-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "var(--s-4)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(28px, 3vw, 38px)",
                      color: "var(--accent-blue)",
                      lineHeight: 1,
                      fontVariationSettings: '"opsz" 32, "SOFT" 100',
                    }}
                  >
                    {stat.value}
                  </span>
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    {stat.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── § II · Search & Filter ─────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
              style={{ marginBottom: "var(--s-5)" }}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ II</span>
                The Registry
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-h2">
                Browse the Universe.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 10, maxWidth: "56ch" }}
              >
                Every active labour-law instrument in Bangladesh — searchable,
                filterable, and citation-mapped.
              </motion.p>
            </motion.div>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 sm:items-center"
              style={{ marginBottom: "var(--s-5)" }}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inViewOnce}
              transition={{ duration: 0.55, ease: EASE_OUT }}
            >
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 14,
                    height: 14,
                    color: "var(--ink-4)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("docs.searchPlaceholder")}
                  className="lf-input"
                  style={{ paddingLeft: 38, width: "100%" }}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                {filterConfig.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveFilter(f.key)}
                    className={
                      activeFilter === f.key
                        ? "lf-cta lf-cta--primary lf-glow"
                        : "lf-cta lf-cta--ghost lf-glow"
                    }
                    style={{
                      padding: "9px 16px",
                      fontSize: 10.5,
                      letterSpacing: "0.18em",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {t(f.labelKey)}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Primary Legislation */}
            {parents.length > 0 && (
              <div style={{ marginBottom: "var(--s-6)" }}>
                <div
                  className="flex items-center gap-3"
                  style={{ marginBottom: "var(--s-4)" }}
                >
                  <span className="lf-meta lf-meta--accent inline-flex items-center gap-2">
                    <Scale style={{ width: 13, height: 13 }} />
                    {t("docs.primary")}
                  </span>
                  <span
                    aria-hidden
                    style={{ flex: 1, height: 1, background: "var(--line-2)" }}
                  />
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    {String(parents.length).padStart(2, "0")}
                  </span>
                </div>
                <motion.div
                  className="grid gap-4 sm:grid-cols-2"
                  variants={stagger}
                  initial="hidden"
                  whileInView="show"
                  viewport={inViewOnce}
                >
                  {parents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      t={t}
                      isPrimary
                      flags={translationFlags?.[doc.id]}
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {/* Amendments & Ordinances */}
            {amendments.length > 0 && (
              <div style={{ marginBottom: "var(--s-6)" }}>
                <div
                  className="flex items-center gap-3"
                  style={{ marginBottom: "var(--s-4)" }}
                >
                  <span className="lf-meta lf-meta--bronze inline-flex items-center gap-2">
                    <GitBranch style={{ width: 13, height: 13 }} />
                    {t("docs.amendments")}
                  </span>
                  <span
                    aria-hidden
                    style={{ flex: 1, height: 1, background: "var(--line-2)" }}
                  />
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    {String(amendments.length).padStart(2, "0")}
                  </span>
                </div>
                <motion.div
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  variants={stagger}
                  initial="hidden"
                  whileInView="show"
                  viewport={inViewOnce}
                >
                  {amendments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      t={t}
                      flags={translationFlags?.[doc.id]}
                    />
                  ))}
                </motion.div>
              </div>
            )}

            {/* No results */}
            {filtered.length === 0 && (
              <div
                className="lf-card text-center"
                style={{
                  padding: "clamp(40px, 6vw, 80px) 24px",
                  borderStyle: "dashed",
                }}
              >
                <FileText
                  style={{
                    width: 32,
                    height: 32,
                    margin: "0 auto",
                    marginBottom: 14,
                    color: "var(--ink-4)",
                    opacity: 0.45,
                  }}
                />
                <p className="lf-body">No documents match your search.</p>
              </div>
            )}
          </section>

          {/* ─── § III · Supersession Timeline ──────────────────────── */}
          {chains.length > 0 && activeFilter === "all" && !searchQuery && (
            <section className="lf-section">
              <motion.div
                className="lf-section-header"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                <motion.div variants={fadeUp} className="lf-kicker">
                  <span className="lf-kicker-mark">§ III</span>
                  {t("docs.supersessionTimeline")}
                </motion.div>
                <motion.h2 variants={fadeUp} className="lf-h2">
                  Trace the lineage.
                </motion.h2>
                <motion.p
                  variants={fadeUp}
                  className="lf-section-deck"
                  style={{ marginTop: 10, maxWidth: "56ch" }}
                >
                  Every parent act and the amendments that have refined it —
                  drag horizontally to follow the chain.
                </motion.p>
              </motion.div>

              <motion.div
                className="space-y-5"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                {chains.map((chain) => (
                  <SupersessionTimeline
                    key={chain.parent}
                    chain={chain}
                    documents={documents}
                    t={t}
                  />
                ))}
              </motion.div>
            </section>
          )}

          {/* ─── § IV · Consult CTA ─────────────────────────────────── */}
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
                <div className="lf-section-eyebrow">
                  <span className="lf-section-eyebrow-rule" />
                  <span className="lf-meta lf-meta--accent">§ IV</span>
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    Query the Registry
                  </span>
                </div>
                <h2 className="lf-h2" style={{ maxWidth: "22ch" }}>
                  Ask in plain language.{" "}
                  <em>Cite it back to the page.</em>
                </h2>
                <p
                  className="lf-section-deck"
                  style={{ marginTop: 14, maxWidth: "56ch" }}
                >
                  The LLP AI search reads every document in this Universe —
                  bilingual, citation-locked, and audit-ready.
                </p>
                <div
                  className="flex flex-wrap items-center gap-3"
                  style={{ marginTop: 28 }}
                >
                  <Link href="/chat" className="lf-cta lf-cta--primary lf-glow">
                    <Sparkles style={{ width: 13, height: 13 }} />
                    Ask LLP AI
                    <ArrowRight style={{ width: 13, height: 13 }} />
                  </Link>
                  <Link href="/research" className="lf-cta lf-cta--ghost lf-glow">
                    <Scale style={{ width: 13, height: 13 }} />
                    Research Lab
                  </Link>
                </div>
              </div>
            </motion.div>
          </section>
        </main>

        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}

/* ───────────────── Document Card ───────────────── */

function DocumentCard({
  doc,
  t,
  isPrimary,
  flags,
}: {
  doc: DocumentMeta;
  t: (key: string, params?: Record<string, string | number>) => string;
  isPrimary?: boolean;
  flags?: TranslationFlags;
}) {
  const tone = toneFor[doc.instrument_type] ?? "accent-blue";
  const statusKey =
    doc.status === "active_with_amendments" ? "docs.activeAmended" : "docs.active";
  const statusTone: "live" | "busy" =
    doc.status === "active_with_amendments" ? "busy" : "live";
  const year = doc.date_enacted.split("-")[0];

  return (
    <motion.div variants={fadeUp} style={{ display: "flex" }}>
      <Link
        href={`/documents/${doc.id}`}
        className="lf-card lf-card--hover"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          textDecoration: "none",
          color: "inherit",
          padding: isPrimary ? "var(--s-5)" : "var(--s-4)",
        }}
      >
        {/* Top tone bar */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, var(--${tone}) 0%, color-mix(in oklab, var(--${tone}) 35%, transparent) 100%)`,
            borderTopLeftRadius: "var(--r-lg)",
            borderTopRightRadius: "var(--r-lg)",
          }}
        />

        <div className="flex items-start justify-between gap-2">
          <span
            className="lf-tag"
            style={{
              color: `var(--${tone})`,
              background: `color-mix(in oklab, var(--${tone}) 12%, transparent)`,
              borderColor: `color-mix(in oklab, var(--${tone}) 26%, transparent)`,
            }}
          >
            {doc.instrument_type}
          </span>
          <span className={`lf-status lf-status--${statusTone}`}>
            <span className="lf-status-dot" />
            {t(statusKey)}
          </span>
        </div>

        <h3
          className="lf-h3"
          style={{
            fontSize: isPrimary ? 19 : 16,
            lineHeight: 1.25,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {doc.title}
        </h3>

        {doc.amends && (
          <p className="lf-meta" style={{ fontSize: 10 }}>
            {t("docs.amends", { id: doc.amends })}
          </p>
        )}

        {/* Section preview pills for amendments */}
        {doc.sections_amended && doc.sections_amended.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {doc.sections_amended.slice(0, 3).map((sec) => (
              <span
                key={sec}
                className="lf-tag lf-tag--more"
                style={{
                  fontSize: 9.5,
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {sec}
              </span>
            ))}
            {doc.sections_amended.length > 3 && (
              <span className="lf-tag lf-tag--more" style={{ fontSize: 9.5 }}>
                +{doc.sections_amended.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Chapter count badge for primary docs */}
        {isPrimary && doc.chapters && (
          <div>
            <span className="lf-tag lf-tag--skill" style={{ fontSize: 9.5 }}>
              {doc.chapters.length} chapters
            </span>
          </div>
        )}

        <div
          className="flex items-center justify-between gap-2"
          style={{
            marginTop: "auto",
            paddingTop: 14,
            borderTop: "1px solid var(--line-1)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <span
              className="lf-meta inline-flex items-center gap-1.5"
              style={{ fontSize: 10 }}
            >
              <Calendar style={{ width: 11, height: 11 }} />
              {year}
            </span>
            <span
              className="lf-meta inline-flex items-center gap-1.5"
              style={{ fontSize: 10 }}
            >
              <FileText style={{ width: 11, height: 11 }} />
              {doc.pages}p
            </span>
            <span
              className="lf-meta inline-flex items-center gap-1.5"
              style={{ fontSize: 10 }}
            >
              <Globe style={{ width: 11, height: 11 }} />
              EN | BN
            </span>
            {(flags?.enTranslated || flags?.bnTranslated) && (
              <span
                className="lf-meta inline-flex items-center gap-1.5"
                style={{ fontSize: 10, color: "var(--bronze)" }}
              >
                <Bot style={{ width: 11, height: 11 }} />
                AI
              </span>
            )}
          </div>
          <ArrowRight
            className="lf-card-arrow"
            style={{
              width: 13,
              height: 13,
              color: "var(--accent-blue)",
              flexShrink: 0,
              transition: "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

/* ───────────────── Supersession Timeline ───────────────── */

function SupersessionTimeline({
  chain,
  documents,
  t,
}: {
  chain: SupersessionChain;
  documents: DocumentMeta[];
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const parentDoc = documents.find((d) => d.id === chain.parent);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft.current - (x - startX.current);
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  }, []);

  if (!parentDoc) return null;

  const chainDocs = chain.chain
    .map((id) => documents.find((d) => d.id === id))
    .filter(Boolean) as DocumentMeta[];

  return (
    <motion.div
      ref={scrollRef}
      variants={fadeUp}
      className="lf-card no-scrollbar select-none"
      style={{
        padding: "var(--s-5)",
        overflowX: "auto",
        cursor: "grab",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="flex items-center gap-3" style={{ minWidth: "max-content" }}>
        {/* Parent node */}
        <Link
          href={`/documents/${parentDoc.id}`}
          className="lf-card lf-card--hover"
          style={{
            flexShrink: 0,
            padding: "12px 18px",
            textAlign: "center",
            minWidth: 156,
            textDecoration: "none",
            color: "inherit",
            border: "1px solid color-mix(in oklab, var(--accent-blue) 50%, var(--glass-border))",
          }}
        >
          <p
            className="truncate"
            style={{
              fontFamily: "var(--lf-display)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            {parentDoc.title.replace("Bangladesh ", "").split(",")[0]}
          </p>
          <p className="lf-meta" style={{ marginTop: 4, fontSize: 9.5 }}>
            {parentDoc.date_enacted.split("-")[0]}
          </p>
        </Link>

        {chainDocs.map((doc) => {
          const isLatest = doc.id === chain.latest;
          return (
            <div key={doc.id} className="flex items-center gap-3 shrink-0">
              {/* Arrow connector */}
              <div
                className="flex items-center gap-1"
                style={{ color: "var(--ink-4)" }}
              >
                <span
                  aria-hidden
                  style={{ width: 24, height: 1, background: "var(--line-2)" }}
                />
                <ArrowRight style={{ width: 12, height: 12 }} />
              </div>

              {/* Amendment node */}
              <Link
                href={`/documents/${doc.id}`}
                className="lf-card lf-card--hover"
                style={{
                  position: "relative",
                  padding: "12px 18px",
                  textAlign: "center",
                  minWidth: 132,
                  textDecoration: "none",
                  color: "inherit",
                  border: isLatest
                    ? "1px solid color-mix(in oklab, var(--accent-blue) 60%, var(--glass-border))"
                    : "1px solid var(--glass-border)",
                  boxShadow: isLatest
                    ? "0 12px 32px -16px color-mix(in oklab, var(--accent-blue) 35%, transparent)"
                    : undefined,
                }}
              >
                {isLatest && (
                  <span
                    style={{
                      position: "absolute",
                      top: -10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontFamily: "var(--lf-mono)",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#fafaf5",
                      background: "var(--accent-blue)",
                      padding: "3px 10px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("docs.latest")}
                  </span>
                )}
                <p
                  className="truncate"
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--ink)",
                    lineHeight: 1.2,
                  }}
                >
                  {doc.instrument_type === "Ordinance" ? "Ordinance" : "Amendment"}{" "}
                  {doc.date_enacted.split("-")[0]}
                </p>
                <p className="lf-meta" style={{ marginTop: 4, fontSize: 9.5 }}>
                  {doc.id}
                </p>
              </Link>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
