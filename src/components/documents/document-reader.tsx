"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Copy,
  Globe,
  Link2,
  Menu,
  Eye,
  Settings2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteTopNav } from "@/components/site/site-top-nav";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/use-language";
import { useReaderPreferences } from "@/hooks/use-reader-preferences";
import dynamic from "next/dynamic";
import type { DocumentMeta, ParsedSection } from "@/lib/documents";
import "@/components/landing/landing.css";

const PdfViewerModal = dynamic(
  () => import("@/components/documents/pdf-viewer-modal").then((m) => m.PdfViewerModal),
  { ssr: false }
);

// Maps instrument_type → lf-tag tone (accent-blue / bronze / emerald / rust)
const typeTone: Record<string, "accent-blue" | "bronze" | "emerald" | "rust"> = {
  Act: "accent-blue",
  "Amendment Act": "bronze",
  Rules: "emerald",
  "Amendment Rules": "emerald",
  Ordinance: "rust",
};

// Status → lf-status modifier
const statusToneFor = (status: string): "live" | "busy" | "off" => {
  if (status === "active") return "live";
  if (status === "active_with_amendments") return "busy";
  return "off";
};

interface DocumentReaderProps {
  meta: DocumentMeta;
  sectionsEn: ParsedSection[];
  sectionsBn: ParsedSection[] | null;
  enTranslated?: boolean;
  bnTranslated?: boolean;
  pdfLangs?: { en: boolean; bn: boolean };
}

export function DocumentReader({ meta, sectionsEn, sectionsBn, enTranslated, bnTranslated, pdfLangs }: DocumentReaderProps) {
  const { language, t } = useLanguage();
  const { fontSize, fontFamily, readerTheme, loaded, setFontSize, setFontFamily, setReaderTheme } = useReaderPreferences();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  // Pick sections based on current language, with fallback
  const hasEn = sectionsEn.length > 0;
  const hasBn = sectionsBn !== null && sectionsBn.length > 0;
  const sections = language === "bn" && hasBn ? sectionsBn : hasEn ? sectionsEn : (sectionsBn ?? sectionsEn);
  const hasBothLanguages = hasEn && hasBn;
  const [activeId, setActiveId] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showContextBar, setShowContextBar] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );
  const [pdfOpen, setPdfOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const year = meta.date_enacted.split("-")[0];

  const tone = typeTone[meta.instrument_type] || "accent-blue";
  const statusKey =
    meta.status === "active_with_amendments"
      ? "docs.activeAmended"
      : "docs.active";
  const statusTone = statusToneFor(meta.status);

  // Handle initial hash scroll and highlight
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setHighlightId(hash);
          setActiveId(hash);
          setTimeout(() => setHighlightId(null), 2000);
        }
      }, 300);
    }
  }, []);

  // Intersection observer for active TOC tracking
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const headings = container.querySelectorAll("[data-section-id]");
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.sectionId;
            if (id) setActiveId(id);
          }
        }
      },
      {
        root: container,
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0,
      }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  // Scroll progress bar + context bar visibility
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress =
        scrollHeight <= clientHeight
          ? 0
          : (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);

      // Show context bar when scrolled past title area
      setShowContextBar(scrollTop > 200);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-expand chapter containing active section
  useEffect(() => {
    if (!activeId) return;
    const chapter = sections.find(
      (s) =>
        s.id === activeId ||
        s.children?.some((c) => c.id === activeId)
    );
    if (chapter) {
      setExpandedChapters((prev) => {
        const next = new Set(prev);
        next.add(chapter.id);
        return next;
      });
    }
  }, [activeId, sections]);

  const scrollToSection = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
        setTocOpen(false);
        window.history.replaceState(null, "", `#${id}`);
      }
    },
    []
  );

  const toggleChapter = useCallback((id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Derive context label from activeId
  const activeSection = findSectionById(sections, activeId);

  // Build grouped TOC
  const tocGroups = buildTocGroups(sections);

  return (
    <div
      className="lf-page h-dvh flex flex-col overflow-hidden"
      data-theme={themeAttr}
      suppressHydrationWarning
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <SiteTopNav />

      {/* Reading Progress Bar */}
      <div className="sticky top-0 left-0 right-0 z-50 h-0.5 bg-transparent">
        <div
          className="h-full transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%`, background: "var(--accent-blue)" }}
        />
      </div>

      {/* Reader Toolbar — glass surface */}
      <header
        className="shrink-0 z-30"
        style={{
          background: "var(--glass-bg)",
          borderBottom: "1px solid var(--glass-border)",
          backdropFilter: "blur(14px) saturate(130%)",
          WebkitBackdropFilter: "blur(14px) saturate(130%)",
        }}
      >
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/documents"
              className="flex items-center gap-1.5 text-sm shrink-0 transition-colors"
              style={{ color: "var(--ink-3)" }}
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">
                {t("docs.backToDocuments")}
              </span>
            </Link>
            <ChevronRight className="size-3 shrink-0" style={{ color: "var(--ink-4)" }} />
            <span className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
              {meta.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile reader controls toggle */}
            <button
              type="button"
              className="lf-icon-btn lg:hidden"
              onClick={() => setControlsOpen(!controlsOpen)}
              aria-label="Reader controls"
            >
              <Settings2 className="size-4" />
            </button>
            {/* Mobile TOC toggle */}
            <button
              type="button"
              className="lf-icon-btn lg:hidden"
              onClick={() => setTocOpen(!tocOpen)}
              aria-label="Table of contents"
            >
              {tocOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Reader controls toolbar — hidden on mobile, toggled via settings icon */}
        <div
          className={cn(
            "px-4 lg:px-6 py-1.5 items-center justify-center gap-3 text-xs",
            controlsOpen ? "flex" : "hidden lg:flex"
          )}
          style={{
            borderTop: "1px solid var(--glass-border)",
            color: "var(--ink-3)",
          }}
        >
          {/* Font Size */}
          <div
            className="flex items-center rounded-full p-0.5"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <button
              onClick={() => setFontSize((s) => s - 1)}
              disabled={fontSize <= 12}
              className="px-2 py-1 rounded-full text-sm font-medium disabled:opacity-30 disabled:pointer-events-none transition-colors"
              style={{ color: "var(--ink-3)" }}
            >
              A<span className="text-[10px] align-super">-</span>
            </button>
            <span className="text-[11px] font-medium w-6 text-center tabular-nums" style={{ color: "var(--ink)" }}>
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize((s) => s + 1)}
              disabled={fontSize >= 24}
              className="px-2 py-1 rounded-full text-sm font-medium disabled:opacity-30 disabled:pointer-events-none transition-colors"
              style={{ color: "var(--ink-3)" }}
            >
              A<span className="text-[10px] align-super">+</span>
            </button>
          </div>

          <span style={{ color: "var(--line-2)" }}>|</span>

          {/* Reading Theme: Auto / Sepia */}
          <div
            className="flex p-0.5 rounded-full"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <button
              onClick={() => setReaderTheme("auto")}
              className="text-xs py-1 px-2.5 rounded-full transition-colors"
              style={
                readerTheme === "auto"
                  ? { background: "var(--glass-bg-strong)", color: "var(--ink)", fontWeight: 600 }
                  : { color: "var(--ink-3)" }
              }
            >
              Auto
            </button>
            <button
              onClick={() => setReaderTheme("sepia")}
              className="text-xs py-1 px-2.5 rounded-full transition-colors"
              style={
                readerTheme === "sepia"
                  ? { background: "var(--glass-bg-strong)", color: "var(--bronze)", fontWeight: 600 }
                  : { color: "var(--ink-3)" }
              }
            >
              Sepia
            </button>
          </div>

          <span className="hidden sm:inline" style={{ color: "var(--line-2)" }}>|</span>

          {/* Font Family: Sans / Serif — hidden on very small screens */}
          <div
            className="hidden sm:flex p-0.5 rounded-full"
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          >
            <button
              onClick={() => setFontFamily("sans")}
              className="text-xs py-1 px-2.5 rounded-full font-sans transition-colors"
              style={
                fontFamily === "sans"
                  ? { background: "var(--glass-bg-strong)", color: "var(--ink)", fontWeight: 600 }
                  : { color: "var(--ink-3)" }
              }
            >
              Sans
            </button>
            <button
              onClick={() => setFontFamily("serif")}
              className="text-xs py-1 px-2.5 rounded-full font-serif transition-colors"
              style={
                fontFamily === "serif"
                  ? { background: "var(--glass-bg-strong)", color: "var(--ink)", fontWeight: 600 }
                  : { color: "var(--ink-3)" }
              }
            >
              Serif
            </button>
          </div>
        </div>

        {/* Floating Context Bar — desktop only */}
        <div
          className={cn(
            "px-4 lg:px-6 overflow-hidden transition-all duration-300 hidden lg:block",
            showContextBar ? "py-1.5 max-h-10 opacity-100" : "max-h-0 opacity-0 py-0"
          )}
          style={{ borderTop: "1px solid var(--glass-border)" }}
        >
          {activeSection && (
            <p className="text-xs truncate" style={{ color: "var(--ink-3)" }}>
              <span className="font-medium" style={{ color: "var(--ink-2)" }}>
                {activeSection.parent ? `${activeSection.parent} › ` : ""}
              </span>
              <span style={{ color: "var(--ink)" }}>{activeSection.title}</span>
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Collapsible TOC Sidebar — glass panel */}
        <aside
          className={cn(
            "w-72 overflow-y-auto no-scrollbar shrink-0",
            "hidden lg:block",
            tocOpen &&
              "!block fixed inset-0 top-[7rem] z-20 w-full sm:w-80 lg:relative lg:w-72 animate-in slide-in-from-left duration-200"
          )}
          style={{
            borderRight: "1px solid var(--glass-border)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(14px) saturate(130%)",
            WebkitBackdropFilter: "blur(14px) saturate(130%)",
          }}
        >
          <nav className="p-4">
            <p
              className="text-xs font-medium uppercase tracking-wider mb-3"
              style={{
                color: "var(--ink-4)",
                fontFamily: "var(--lf-mono)",
                letterSpacing: "0.08em",
              }}
            >
              {t("docs.toc")}
            </p>
            <div className="space-y-0.5">
              {tocGroups.map((group) => {
                if (group.type === "chapter") {
                  const isExpanded = expandedChapters.has(group.id);
                  const childCount = group.children?.length || 0;
                  const isActiveChapter =
                    activeId === group.id ||
                    group.children?.some((c) => c.id === activeId);

                  return (
                    <div key={group.id}>
                      <button
                        onClick={() => {
                          toggleChapter(group.id);
                          scrollToSection(group.id);
                        }}
                        className="w-full text-left text-sm py-1.5 px-2.5 rounded-md transition-colors flex items-center gap-1.5"
                        style={
                          isActiveChapter
                            ? {
                                background: "var(--accent-blue-ghost)",
                                color: "var(--accent-blue)",
                                fontWeight: 600,
                              }
                            : { color: "var(--ink-3)" }
                        }
                      >
                        <ChevronRight
                          className={cn(
                            "size-3 shrink-0 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                        <span className="truncate flex-1">{group.title}</span>
                        {childCount > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{
                              background: "var(--glass-bg-strong)",
                              border: "1px solid var(--glass-border)",
                              color: "var(--ink-3)",
                            }}
                          >
                            {childCount}
                          </span>
                        )}
                      </button>
                      {isExpanded && group.children && (
                        <div
                          className="ml-2 space-y-0.5 mt-0.5"
                          style={{ borderLeft: "1px solid var(--line-2)" }}
                        >
                          {group.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => scrollToSection(child.id)}
                              className="w-full text-left text-xs py-1.5 px-3 rounded-md transition-colors truncate block"
                              style={
                                activeId === child.id
                                  ? {
                                      background: "var(--accent-blue-ghost)",
                                      color: "var(--accent-blue)",
                                      fontWeight: 600,
                                      borderLeft: "2px solid var(--accent-blue)",
                                      marginLeft: "-1px",
                                    }
                                  : { color: "var(--ink-3)" }
                              }
                              title={child.title}
                            >
                              {child.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Standalone section (no parent chapter)
                return (
                  <button
                    key={group.id}
                    onClick={() => scrollToSection(group.id)}
                    className="w-full text-left text-sm py-1.5 px-2.5 rounded-md transition-colors truncate block"
                    style={
                      activeId === group.id
                        ? {
                            background: "var(--accent-blue-ghost)",
                            color: "var(--accent-blue)",
                            fontWeight: 600,
                          }
                        : { color: "var(--ink-3)" }
                    }
                    title={group.title}
                  >
                    {group.title}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Overlay for mobile TOC */}
        {tocOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-10 lg:hidden"
            onClick={() => setTocOpen(false)}
          />
        )}

        {/* Document Content */}
        <main
          ref={contentRef}
          className={cn("flex-1 overflow-y-auto transition-colors duration-300", readerTheme === "sepia" && "reader-sepia")}
        >
          <div
            className={cn(
              "max-w-3xl mx-auto px-6 py-8 md:py-12 transition-all duration-300",
              fontFamily === "serif" ? "font-serif" : "font-sans"
            )}
            style={{ fontSize: `${fontSize}px` }}
          >
            {/* Document Title — feature card surface */}
            <div
              ref={titleRef}
              className="mb-8 p-6 md:p-8 lf-card lf-card--feature"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={cn("lf-tag", `lf-tag--${tone === "accent-blue" ? "skill" : tone === "emerald" ? "sector" : "more"}`)}
                  style={
                    tone === "bronze"
                      ? { color: "var(--bronze)", borderColor: "color-mix(in oklab, var(--bronze) 36%, var(--glass-border))" }
                      : tone === "rust"
                      ? { color: "var(--rust)", borderColor: "color-mix(in oklab, var(--rust) 36%, var(--glass-border))" }
                      : undefined
                  }
                >
                  {meta.instrument_type}
                </span>
                <span className={`lf-status lf-status--${statusTone}`}>
                  <span className="lf-status-dot" />
                  {t(statusKey)}
                </span>
              </div>
              <h1
                className="lf-h2"
                style={{ marginBottom: 0, fontSize: "clamp(24px, 2.4vw, 32px)" }}
              >
                {meta.title}
              </h1>
              {meta.instrument_number && (
                <p className="lf-meta" style={{ marginTop: 8 }}>
                  {meta.instrument_number}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="lf-tag">{year}</span>
                <span className="lf-tag">{t("docs.pages", { count: meta.pages })}</span>
                <span className="lf-tag">{meta.language}</span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setPdfOpen(true)}
                  className="lf-cta lf-cta--ghost lf-glow"
                >
                  <Eye className="size-3.5" />
                  {t("docs.seePdf")}
                </button>
              </div>

              {/* Amendment callout */}
              {meta.amends && (
                <div
                  className="mt-4 p-3"
                  style={{
                    background: "var(--bronze-ghost)",
                    border: "1px solid color-mix(in oklab, var(--bronze) 30%, var(--glass-border))",
                    borderRadius: "var(--r-md)",
                  }}
                >
                  <p className="text-xs" style={{ color: "var(--bronze)" }}>
                    This document amends{" "}
                    <Link
                      href={`/documents/${meta.amends}`}
                      className="font-medium underline underline-offset-2"
                      style={{ color: "var(--bronze)" }}
                    >
                      {meta.amends}
                    </Link>
                  </p>
                </div>
              )}

              {/* Language notice */}
              {language === "bn" && !hasBn && (
                <div
                  className="mt-4 p-3"
                  style={{
                    background: "var(--accent-blue-ghost)",
                    border: "1px solid color-mix(in oklab, var(--accent-blue) 30%, var(--glass-border))",
                    borderRadius: "var(--r-md)",
                  }}
                >
                  <p className="text-xs" style={{ color: "var(--accent-blue)" }}>
                    {t("docs.noBanglaVersion")}
                  </p>
                </div>
              )}
              {language === "en" && !hasEn && (
                <div
                  className="mt-4 p-3"
                  style={{
                    background: "var(--accent-blue-ghost)",
                    border: "1px solid color-mix(in oklab, var(--accent-blue) 30%, var(--glass-border))",
                    borderRadius: "var(--r-md)",
                  }}
                >
                  <p className="text-xs" style={{ color: "var(--accent-blue)" }}>
                    {t("docs.noEnglishVersion")}
                  </p>
                </div>
              )}
              {(hasEn || hasBn) && (
                <div className="mt-4 flex items-center gap-2">
                  <Globe className="size-3.5" style={{ color: "var(--ink-4)" }} />
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                    {language === "bn" && hasBn
                      ? t("docs.viewingBangla")
                      : language === "en" && hasEn
                        ? t("docs.viewingEnglish")
                        : hasBn
                          ? t("docs.viewingBangla")
                          : t("docs.viewingEnglish")}
                  </span>
                  {/* Translated badge */}
                  {((language === "bn" && hasBn && bnTranslated) ||
                    (language === "en" && hasEn && enTranslated) ||
                    (language === "bn" && !hasBn && hasEn && enTranslated) ||
                    (language === "en" && !hasEn && hasBn && bnTranslated)) && (
                    <span
                      className="lf-tag"
                      style={{
                        color: "var(--bronze)",
                        borderColor: "color-mix(in oklab, var(--bronze) 36%, var(--glass-border))",
                        fontSize: 10,
                      }}
                    >
                      {t("docs.translated")}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Sections */}
            <div className="space-y-1">
              <TooltipProvider>
                {sections.map((section) => (
                  <SectionBlock
                    key={section.id}
                    section={section}
                    highlightId={highlightId}
                    t={t}
                  />
                ))}
              </TooltipProvider>
            </div>
          </div>
        </main>
      </div>

      <PdfViewerModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        docId={meta.id}
        title={meta.title}
        pdfLangs={pdfLangs}
      />
    </div>
  );
}

function SectionBlock({
  section,
  highlightId,
  t,
}: {
  section: ParsedSection;
  highlightId: string | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const isHighlighted = highlightId === section.id;
  const isChapter = section.level === "chapter";

  return (
    <div className="mb-0">
      <div
        id={section.id}
        data-section-id={section.id}
        className={cn(
          "scroll-mt-36 rounded-lg transition-all duration-500 group/section",
          isChapter && "mt-12 first:mt-0"
        )}
        style={
          isHighlighted
            ? {
                background: "var(--accent-blue-ghost)",
                boxShadow: "0 0 0 2px color-mix(in oklab, var(--accent-blue) 24%, transparent)",
                padding: "1rem",
                margin: "0 -1rem",
              }
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            className={cn(
              "font-bold tracking-tight mb-3",
              isChapter ? "text-2xl flex items-center gap-2" : "text-lg pl-3 transition-colors"
            )}
            style={
              !isChapter
                ? { borderLeft: "2px solid color-mix(in oklab, var(--accent-blue) 32%, var(--line-2))" }
                : undefined
            }
          >
            {isChapter && (
              <span
                className="inline-flex items-center justify-center size-7 shrink-0"
                style={{
                  background: "var(--accent-blue-ghost)",
                  color: "var(--accent-blue)",
                  borderRadius: "var(--r-md)",
                  border: "1px solid color-mix(in oklab, var(--accent-blue) 24%, var(--glass-border))",
                }}
              >
                <BookOpen className="size-3.5" />
              </span>
            )}
            {section.title}
          </h2>
          {/* Section actions */}
          <div className="opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-1 shrink-0 mt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}#${section.id}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="lf-icon-btn"
                  aria-label={t("docs.copyLink")}
                >
                  <Link2 className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t("docs.copyLink")}</p>
              </TooltipContent>
            </Tooltip>
            {section.content && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(section.content);
                    }}
                    className="lf-icon-btn"
                    aria-label={t("docs.copyText")}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{t("docs.copyText")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {section.content && (
          <div
            className="leading-[1.85] whitespace-pre-wrap"
            style={{ color: "var(--ink-2)" }}
          >
            {section.content}
          </div>
        )}
      </div>

      {/* Children (subsections under a chapter) */}
      {section.children?.map((child) => (
        <div
          key={child.id}
          id={child.id}
          data-section-id={child.id}
          className="scroll-mt-36 mt-6 pl-4 rounded-lg transition-all duration-500 group/section"
          style={
            highlightId === child.id
              ? {
                  background: "var(--accent-blue-ghost)",
                  boxShadow: "0 0 0 2px color-mix(in oklab, var(--accent-blue) 24%, transparent)",
                  padding: "1rem",
                  borderLeft: "2px solid var(--accent-blue)",
                }
              : {
                  borderLeft: "2px solid color-mix(in oklab, var(--accent-blue) 24%, var(--line-2))",
                }
          }
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold mb-2" style={{ color: "var(--ink)" }}>
              {child.title}
            </h3>
            <div className="opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-1 shrink-0 mt-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}#${child.id}`;
                      navigator.clipboard.writeText(url);
                    }}
                    className="lf-icon-btn"
                    aria-label={t("docs.copyLink")}
                  >
                    <Link2 className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{t("docs.copyLink")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {child.content && (
            <div
              className="leading-[1.85] whitespace-pre-wrap"
              style={{ color: "var(--ink-2)" }}
            >
              {child.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Find active section info for context bar. */
function findSectionById(
  sections: ParsedSection[],
  id: string
): { title: string; parent?: string } | null {
  for (const sec of sections) {
    if (sec.id === id) return { title: sec.title };
    if (sec.children) {
      for (const child of sec.children) {
        if (child.id === id)
          return { title: child.title, parent: sec.title };
      }
    }
  }
  return null;
}

/** Build TOC groups with chapters as collapsible parents. */
function buildTocGroups(sections: ParsedSection[]) {
  return sections.map((sec) => ({
    id: sec.id,
    title: sec.title,
    type: sec.level as string,
    children: sec.children?.map((c) => ({
      id: c.id,
      title: c.title,
    })),
  }));
}
