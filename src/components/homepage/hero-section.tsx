"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, MessageSquare, FileText, Cpu, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const HERO_QUERIES = [
  "Maternity leave entitlement under the Labour Act...",
  "Overtime pay calculation for factory workers...",
  "Termination notice period requirements...",
  "Provident fund and gratuity rights...",
  "Annual leave and casual leave rules...",
  "Wrongful dismissal compensation...",
];

const MODE_TABS = [
  { key: "search", label: "Search", icon: Search, href: "/chat" },
  { key: "chat", label: "Ask AI", icon: MessageSquare, href: "/chat" },
  { key: "draft", label: "Draft", icon: FileText, href: "/chat?mode=document" },
];

const HERO_MARQUEE_ITEMS = [
  "Labour Act 2006",
  "Amendments",
  "Ordinance 2025",
  "Rules 2015",
  "Amendment 2022",
  "Wages & Minimum Wage",
  "Working Hours",
  "Overtime",
  "Maternity Leave",
  "Provident Fund",
  "Gratuity",
  "Termination & Notice",
  "Severance",
  "Occupational Safety",
  "Trade Unions",
  "Collective Bargaining",
  "Dispute Resolution",
  "Labour Court",
  "Compliance Audit",
  "Employment Contracts",
  "Worker Rights",
  "Leave Entitlement",
  "Compensation",
  "EN / বাংলা",
  "Citation-Audited",
  "Supersession-Aware",
];

const LEDGER_STATS = [
  { label: "Queries", value: "1.2k" },
  { label: "Citations", value: "08" },
  { label: "Confidence", value: "97%", accent: true },
  { label: "Latency", value: "1.2s" },
];

const FOREST_BG = `
  radial-gradient(ellipse 70% 55% at 18% 30%, rgba(42,110,72,0.58) 0%, transparent 60%),
  radial-gradient(ellipse 55% 45% at 82% 15%, rgba(178,92,34,0.12) 0%, transparent 55%),
  radial-gradient(ellipse 90% 70% at 50% 115%, rgba(8,28,20,0.85) 0%, transparent 55%),
  linear-gradient(168deg, #061609 0%, #0d2a1a 28%, #0a2315 62%, #07180d 100%)
`;

const PARCHMENT_BG = `
  radial-gradient(ellipse 80% 65% at 70% 35%, #f8f0de 0%, #ecdec2 65%, #e0d1ae 100%),
  linear-gradient(160deg, #f8f0de 0%, #e8d9b7 100%)
`;

// ─────────────────────────────────────────────────────────────
// Folio Spread — editorial book-spread hero
// Full-bleed recto (forest) / verso (parchment), rust thread
// seam, vermillion seal. Legal archive × scientific atlas.
// ─────────────────────────────────────────────────────────────

const heroFolioStyles = `
  @keyframes folioSweep {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  @keyframes folioSeam {
    from { transform: scaleY(0); transform-origin: top; }
    to   { transform: scaleY(1); transform-origin: top; }
  }
  @keyframes folioStamp {
    0%   { opacity: 0; transform: scale(1.35) rotate(-10deg); }
    65%  { opacity: 1; transform: scale(0.94) rotate(-1.5deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }

  /* Editorial tabs */
  .hero-folio .hero-tab {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(240, 232, 216, 0.5);
    border-bottom: 1.5px solid transparent;
    cursor: pointer;
    background: transparent;
  }
  .hero-folio .hero-tab:hover { color: rgba(240, 232, 216, 0.85); }
  .hero-folio .hero-tab[data-active] {
    color: #f3ebdb;
    border-bottom-color: #b25c22;
  }

  /* Search shell */
  .hero-folio .hero-search-shell {
    background: rgba(10, 30, 20, 0.72);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-top: 1px solid rgba(178, 92, 34, 0.45);
    padding: 10px 10px 10px 18px;
    transition: border-color 160ms ease, background 160ms ease;
    text-decoration: none;
  }
  .hero-folio .hero-search-shell:hover {
    background: rgba(12, 34, 22, 0.85);
    border-color: rgba(255, 255, 255, 0.16);
    border-top-color: #b25c22;
  }
  .hero-folio .hero-search-text {
    flex: 1;
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 13px;
    color: rgba(240, 232, 216, 0.78);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hero-folio .hero-kbd {
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    font-size: 10px;
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    color: rgba(240, 232, 216, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  /* Buttons — mirrors ex-btn / jb-primary */
  .hero-folio .hero-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 22px;
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease, filter 160ms ease;
    user-select: none;
    text-decoration: none;
  }
  .hero-folio .hero-btn--sm {
    padding: 9px 14px;
    font-size: 10.5px;
    gap: 8px;
  }
  .hero-folio .hero-btn--primary {
    color: #fafaf5;
    background: linear-gradient(180deg, #3c9b6f 0%, #2e7d5b 100%);
    border-color: #2e7d5b;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 10px 24px -14px rgba(46, 125, 91, 0.55);
  }
  .hero-folio .hero-btn--primary:hover {
    background: linear-gradient(180deg, #45a87a 0%, #337155 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 12px 28px -12px rgba(46, 125, 91, 0.7);
  }
  .hero-folio .hero-btn--rust {
    color: #1d1410;
    background: linear-gradient(180deg,
      color-mix(in oklab, #b25c22 92%, white) 0%,
      color-mix(in oklab, #b25c22 100%, black 14%) 100%);
    border-color: #b25c22;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 10px 24px -14px rgba(178, 92, 34, 0.55);
  }
  .hero-folio .hero-btn--rust:hover { filter: brightness(1.05); }
  .hero-folio .hero-btn--ghost {
    color: rgba(240, 232, 216, 0.75);
    background: transparent;
    border-color: rgba(240, 232, 216, 0.22);
  }
  .hero-folio .hero-btn--ghost:hover {
    color: #f3ebdb;
    border-color: rgba(178, 92, 34, 0.55);
    background: rgba(178, 92, 34, 0.06);
  }

  /* Mobile — hide scrollbar on ticker horizontal scroll */
  .hero-folio .hero-ticker-stats::-webkit-scrollbar { display: none; }

  /* ── Continuous citation marquee ────────────────────────────── */
  .hero-marquee {
    overflow: hidden;
    position: relative;
  }
  .hero-marquee::before,
  .hero-marquee::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 72px;
    z-index: 2;
    pointer-events: none;
  }
  .hero-marquee::before {
    left: 0;
    background: linear-gradient(90deg, #07180d 0%, transparent 100%);
  }
  .hero-marquee::after {
    right: 0;
    background: linear-gradient(270deg, #050f08 0%, transparent 100%);
  }
  .hero-marquee-track {
    display: flex;
    width: max-content;
    animation: heroMarquee 90s linear infinite;
    will-change: transform;
  }
  .hero-marquee:hover .hero-marquee-track {
    animation-play-state: paused;
  }
  .hero-marquee-group {
    display: flex;
    flex-shrink: 0;
  }
  .hero-marquee-item {
    display: inline-flex;
    align-items: center;
    gap: 18px;
    padding: 0 18px;
    white-space: nowrap;
  }
  @media (min-width: 640px) {
    .hero-marquee-item { gap: 24px; padding: 0 24px; }
  }
  .hero-marquee-label {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(240, 232, 216, 0.55);
  }
  .hero-marquee-sep {
    font-family: var(--hp-display), ui-serif, Georgia, serif;
    font-style: italic;
    font-size: 14px;
    color: #b25c22;
    line-height: 1;
    transform: translateY(-1px);
  }
  @keyframes heroMarquee {
    from { transform: translate3d(0, 0, 0); }
    to   { transform: translate3d(-50%, 0, 0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero-marquee-track { animation: none; }
  }
`;

export function HeroSection() {
  const { t } = useLanguage();
  const [displayText, setDisplayText] = useState("");
  const [queryIndex, setQueryIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMode, setActiveMode] = useState<string>("search");

  useEffect(() => {
    const current = HERO_QUERIES[queryIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && charIndex < current.length) {
      timeout = setTimeout(() => {
        setDisplayText(current.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      }, 38);
    } else if (!isDeleting && charIndex === current.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2200);
    } else if (isDeleting && charIndex > 0) {
      timeout = setTimeout(() => {
        setDisplayText(current.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      }, 18);
    } else {
      setIsDeleting(false);
      setQueryIndex((i) => (i + 1) % HERO_QUERIES.length);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, queryIndex]);

  const headlineLines = t("home.hero.headline").split("\n");

  return (
    <section id="product" className="hero-folio relative overflow-hidden" style={{
      background: "#050f08"
    }}>

      {/* Corner registration crosses at section corners */}
      <CornerCross className="absolute top-3 left-3 z-30" tone="ivory" corner="tl" />
      <CornerCross className="absolute top-3 right-3 z-30 hidden lg:block" tone="ink" corner="tr" />

      {/* ═══ THE SPREAD — full bleed edge-to-edge ═══ */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[7fr_1px_5fr] items-stretch">

        {/* ══════════════════════════════════════════════════════ */}
        {/* RECTO — FOREST (title page)                           */}
        {/* ══════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden" style={{ background: FOREST_BG }}>

          {/* Topographic contour */}
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.055]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%239ddbb8' stroke-width='0.5'%3E%3Cpath d='M0 200 Q 200 120 400 200 T 800 200'/%3E%3Cpath d='M0 260 Q 180 180 400 260 T 800 260'/%3E%3Cpath d='M0 340 Q 220 260 400 340 T 800 340'/%3E%3Cpath d='M0 420 Q 200 340 400 420 T 800 420'/%3E%3Cpath d='M0 500 Q 240 420 400 500 T 800 500'/%3E%3Cpath d='M0 580 Q 190 500 400 580 T 800 580'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "1100px 1100px",
            backgroundPosition: "center"
          }} />

          {/* Drafting grid */}
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.035]" style={{
            backgroundImage: "linear-gradient(rgba(248,241,228,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(248,241,228,0.45) 1px, transparent 1px)",
            backgroundSize: "56px 56px"
          }} />

          {/* Law-sign motif — upper-left (moved from /headhunting hero) */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -left-16 hidden md:block"
            style={{
              width: 440,
              height: 380,
              background: "rgba(157,219,184,0.06)",
              WebkitMaskImage: "url('/law-sign.svg')",
              maskImage: "url('/law-sign.svg')",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              transform: "rotate(-8deg)",
            }}
          />

          {/* Forest content — centered with max-w for readability */}
          <div className="relative mx-auto w-full max-w-[720px] px-4 sm:px-5 lg:pl-16 lg:pr-16 xl:pl-20 xl:pr-14 py-10 sm:py-14 lg:py-20">

            {/* Live chip */}
            <div className="mb-6 sm:mb-7 inline-flex max-w-full items-center gap-2 sm:gap-2.5 rounded-full px-3 sm:px-3.5 py-1.5" style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(12px)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "clamp(0.58rem, 2.4vw, 0.66rem)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(240,232,216,0.72)"
            }}>
              <LiveDot color="#4ade80" />
              <span className="truncate">Cross-border · bilingual · human-verified</span>
            </div>

            {/* ─── TRI-COLOR HEADLINE ─── */}
            <h1 style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: "clamp(2.3rem, 9vw, 6.2rem)",
              fontWeight: 600,
              lineHeight: 0.98,
              color: "#f3ebdb",
              letterSpacing: "-0.035em",
              marginBottom: "1.25rem",
              fontVariationSettings: '"opsz" 96, "SOFT" 30'
            }}>
              {(() => {
                if (headlineLines.length === 2 && headlineLines[1].includes(",")) {
                  const [rustChunk, ...rest] = headlineLines[1].split(/,\s+/);
                  const greenChunk = rest.join(", ");
                  return (
                    <>
                      <span className="block">{headlineLines[0]}</span>
                      <span className="block">
                        <em style={{
                          fontStyle: "italic",
                          color: "#e28a4a",
                          fontVariationSettings: '"opsz" 144, "SOFT" 100'
                        }}>{rustChunk},</em>{" "}
                        <span className="relative inline-block">
                          <em style={{
                            fontStyle: "italic",
                            color: "#9ddbb8",
                            fontVariationSettings: '"opsz" 144, "SOFT" 100'
                          }}>{greenChunk}</em>
                          <span aria-hidden className="absolute left-0 right-0 -bottom-1 h-[2px] origin-left animate-[folioSweep_2.2s_cubic-bezier(0.16,1,0.3,1)_0.5s_forwards] scale-x-0" style={{
                            background: "linear-gradient(to right, rgba(157,219,184,0.85), rgba(226,138,74,0.35) 60%, rgba(157,219,184,0.1) 100%)"
                          }} />
                        </span>
                      </span>
                    </>
                  );
                }
                // Multi-line fallback (BN and others) — rotate palette
                const palette = ["#f3ebdb", "#e28a4a", "#9ddbb8"];
                return headlineLines.map((line, i) => (
                  <span key={i} className="block" style={{
                    color: palette[i % palette.length],
                    fontStyle: i === 0 ? "normal" : "italic",
                    fontVariationSettings: i === 0
                      ? '"opsz" 96, "SOFT" 30'
                      : '"opsz" 144, "SOFT" 100'
                  }}>{line}</span>
                ));
              })()}
            </h1>

            {/* Typographic asterism — book ornament */}
            <div aria-hidden style={{
              fontFamily: "var(--font-fraunces), serif",
              fontSize: "1.4rem",
              color: "rgba(226,138,74,0.75)",
              letterSpacing: "0.4em",
              marginBottom: "1.25rem",
              lineHeight: 1
            }}>⁂</div>

            {/* Subline */}
            <p style={{
              fontFamily: "var(--font-fraunces), serif",
              fontStyle: "italic",
              fontSize: "clamp(0.98rem, 3.4vw, 1.12rem)",
              lineHeight: 1.6,
              color: "rgba(240,232,216,0.62)",
              maxWidth: "540px",
              marginBottom: "1.75rem",
              fontVariationSettings: '"opsz" 22'
            }}>
              {t("home.hero.subline")}
            </p>

            {/* Mode tabs — editorial underline style */}
            <div className="mb-4 inline-flex items-center gap-6">
              {MODE_TABS.map(({ key, label, icon: Icon }) => {
                const active = activeMode === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveMode(key)}
                    className="hero-tab inline-flex items-center gap-1.5 pb-2 transition-all"
                    data-active={active || undefined}
                  >
                    <Icon style={{ width: 12, height: 12 }} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Search widget — sharp editorial rectangle */}
            <div className="hero-search relative max-w-xl">
              <Link
                href="/chat"
                className="hero-search-shell relative w-full flex items-center gap-2 sm:gap-3 text-left"
              >
                <Search style={{ width: 16, height: 16, color: "rgba(157,219,184,0.7)", flexShrink: 0 }} />
                <span className="hero-search-text min-w-0">
                  {displayText}
                  <span className="animate-pulse" style={{ color: "rgba(157,219,184,0.9)" }}>▍</span>
                </span>
                <span className="hero-kbd hidden sm:inline-flex">⌘K</span>
                <span className="hero-btn hero-btn--primary hero-btn--sm shrink-0">
                  Start
                  <ArrowRight style={{ width: 12, height: 12 }} />
                </span>
              </Link>
            </div>

            {/* CTA row — approved ex-btn style */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/chat" className="hero-btn hero-btn--primary group">
                <span>{t("home.hero.ctaPrimary")}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/documents" className="hero-btn hero-btn--ghost">
                {t("home.hero.ctaSecondary")}
              </Link>
            </div>

            {/* Partner link */}
            <div className="mt-5" style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "0.66rem",
              letterSpacing: "0.12em",
              color: "rgba(240,232,216,0.42)"
            }}>
              Expert or scout?{" "}
              <Link
                href="/experts/apply"
                className="transition-colors"
                style={{
                  textDecoration: "underline",
                  textDecorationColor: "rgba(226,138,74,0.7)",
                  textDecorationStyle: "dotted",
                  textUnderlineOffset: 4,
                  color: "rgba(240,232,216,0.68)"
                }}
              >
                Explore collaboration →
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* SEAM — rust thread with stitches                      */}
        {/* ══════════════════════════════════════════════════════ */}
        <div aria-hidden className="relative hidden lg:block" style={{ width: "1px", zIndex: 3 }}>
          <div className="absolute inset-0 animate-[folioSeam_1.2s_ease-out_0.2s_both]" style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(178,92,34,0.4) 6%, #b25c22 50%, rgba(178,92,34,0.4) 94%, transparent 100%)",
            transformOrigin: "top"
          }} />
          {/* Stitches */}
          <div className="absolute inset-0 flex flex-col justify-between py-[14%]">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="block -translate-x-1/2" style={{
                width: "7px",
                height: "1.5px",
                background: "#b25c22",
                marginLeft: "0.5px",
                opacity: 0.9
              }} />
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* VERSO — PARCHMENT (legal docket)                      */}
        {/* ══════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden" style={{ background: PARCHMENT_BG }}>

          {/* Paper grain */}
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.3] mix-blend-multiply" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "220px 220px"
          }} />

          {/* Ledger ruled lines */}
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.09]" style={{
            backgroundImage: "linear-gradient(to bottom, rgba(13,42,26,0.55) 1px, transparent 1px)",
            backgroundSize: "100% 30px",
            backgroundPosition: "0 88px"
          }} />

          {/* Foxing/ink speckle — vintage paper */}
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{
            backgroundImage: `
              radial-gradient(circle at 12% 18%, #6b4a1f 0.5px, transparent 1.5px),
              radial-gradient(circle at 68% 42%, #8a5e24 0.5px, transparent 1.5px),
              radial-gradient(circle at 38% 72%, #7a501e 0.5px, transparent 1.5px),
              radial-gradient(circle at 88% 81%, #6b4a1f 0.5px, transparent 1.5px)
            `,
            backgroundSize: "180px 180px, 240px 240px, 200px 200px, 300px 300px"
          }} />

          {/* Parchment content */}
          <div className="relative mx-auto w-full max-w-[520px] px-4 sm:px-5 lg:pl-16 lg:pr-16 xl:pr-20 py-10 sm:py-14 lg:py-20">

            {/* Verso meta — folio no. + wax seal */}
            <div className="flex items-center justify-between mb-7">
              <span style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: "10px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(13,42,26,0.55)"
              }}>
                BLA · 2006 — 2025
              </span>
              <div className="inline-flex items-center gap-2.5">
                <WaxSeal />
                <span style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#a73423",
                  fontWeight: 700
                }}>Active Mandate</span>
              </div>
            </div>

            {/* Commission label — rust caps */}
            <div style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "10px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#b25c22",
              fontWeight: 700,
              marginBottom: "6px"
            }}>Commission № 04</div>

            {/* Display headline — dark forest ink */}
            <h3 style={{
              fontFamily: "var(--font-fraunces), serif",
              fontSize: "clamp(1.75rem, 2.8vw, 2.35rem)",
              fontWeight: 500,
              color: "#0d2a1a",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              marginBottom: "20px",
              fontVariationSettings: '"opsz" 48'
            }}>
              Maternity leave
              <br />
              <em style={{
                fontStyle: "italic",
                color: "#b25c22",
                fontVariationSettings: '"opsz" 144, "SOFT" 100'
              }}>— 120 days</em>
            </h3>

            {/* ─── ANGLED STAMP — vermillion § 46 ─── */}
            <div className="inline-flex mb-7 animate-[folioStamp_0.7s_cubic-bezier(0.18,0.89,0.32,1.28)_1s_both]">
              <div className="relative" style={{
                transform: "rotate(-3.5deg)",
                border: "2px solid #a73423",
                padding: "7px 14px 6px",
                background: "rgba(167,52,35,0.02)"
              }}>
                <div style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: "8.5px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#a73423",
                  fontWeight: 700,
                  marginBottom: "1px"
                }}>Verified · Citation-backed</div>
                <div style={{
                  fontFamily: "var(--font-fraunces), serif",
                  fontStyle: "italic",
                  fontSize: "19px",
                  color: "#a73423",
                  fontWeight: 600,
                  lineHeight: 1,
                  fontVariationSettings: '"opsz" 32, "SOFT" 100'
                }}>§ 46 — BLA 2006</div>
                <span aria-hidden className="absolute -top-1 -right-1 size-1.5 rounded-full" style={{
                  background: "#a73423", opacity: 0.7
                }} />
              </div>
            </div>

            {/* Attributes — dark ink on parchment */}
            <div className="space-y-3 pt-5 mb-6" style={{ borderTop: "1px solid rgba(13,42,26,0.15)" }}>
              <AttrRow icon={<Cpu className="mt-0.5 size-3.5 shrink-0" style={{ color: "#2e7d5b" }} />}
                label="Blueprint" value="AI-structured · human-verified" />
              <AttrRow icon={<span className="mt-0.5 inline-flex items-center justify-center size-3.5 shrink-0" style={{
                fontFamily: "var(--font-fraunces), serif", fontStyle: "italic",
                fontSize: "14px", color: "#b25c22", fontWeight: 700
              }}>§</span>}
                label="Reference · § 46" value="Bangladesh Labour Act 2006 · 2025 Ord." />
              <AttrRow icon={<ShieldCheck className="mt-0.5 size-3.5 shrink-0" style={{ color: "#2e7d5b" }} />}
                label="Provenance" value="Human counsel · dual-checked" />
            </div>

            {/* Ledger stats */}
            <div className="pt-5 mb-5" style={{ borderTop: "1px solid rgba(13,42,26,0.15)" }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 sm:gap-y-0">
                {LEDGER_STATS.map(({ label, value, accent }, i) => (
                  <div
                    key={label}
                    className={`text-center px-1 sm:border-l sm:border-[rgba(13,42,26,0.15)] sm:first:border-l-0 ${i % 2 === 1 ? "border-l border-[rgba(13,42,26,0.15)] sm:border-l" : ""}`}
                  >
                    <div style={{
                      fontFamily: "var(--font-fraunces), serif",
                      fontWeight: 500,
                      fontSize: "clamp(1.4rem, 4.6vw, 1.65rem)",
                      lineHeight: 1,
                      color: accent ? "#b25c22" : "#0d2a1a",
                      letterSpacing: "-0.02em",
                      fontVariationSettings: '"opsz" 48'
                    }}>
                      {value}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: "9.5px",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "rgba(13,42,26,0.5)",
                      marginTop: "5px"
                    }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Alternating progress — rust + forest */}
              <div className="mt-5 flex items-center gap-1.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="flex-1"
                    style={{
                      height: "3px",
                      background:
                        i === 11 ? "rgba(13,42,26,0.18)" :
                          (i % 2 === 0 ? "#2e7d5b" : "#b25c22")
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Brief */}
            <div className="pt-5 mb-5" style={{ borderTop: "1px solid rgba(13,42,26,0.15)" }}>
              <SectionLabel>Brief</SectionLabel>
              <p style={{
                fontFamily: "var(--font-poppins), sans-serif",
                fontSize: "13px",
                lineHeight: 1.62,
                color: "rgba(13,42,26,0.82)"
              }}>
                Female workers earn <strong style={{ color: "#b25c22" }}>60 days pre-delivery + 60 days post-delivery</strong> on full wages, payable within three working days of confinement.
              </p>
            </div>

            {/* Related Provisions — rust pills */}
            <div className="mb-5">
              <SectionLabel>Related Provisions</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { s: "§ 45", l: "Notice Period" },
                  { s: "§ 47", l: "Wage Rate" },
                  { s: "§ 50", l: "Health Benefits" },
                ].map((r) => (
                  <span key={r.s} className="inline-flex items-center gap-1.5 px-2 py-1" style={{
                    background: "rgba(178,92,34,0.08)",
                    border: "1px solid rgba(178,92,34,0.35)"
                  }}>
                    <span style={{
                      fontFamily: "var(--font-fraunces), serif",
                      fontStyle: "italic",
                      fontSize: "12px",
                      color: "#b25c22",
                      fontWeight: 700,
                      fontVariationSettings: '"opsz" 20, "SOFT" 100'
                    }}>{r.s}</span>
                    <span style={{
                      fontFamily: "var(--font-outfit), sans-serif",
                      fontSize: "10.5px",
                      letterSpacing: "0.04em",
                      color: "rgba(13,42,26,0.72)",
                      fontWeight: 500
                    }}>{r.l}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Recent queries */}
            <div className="pt-4 mb-6" style={{ borderTop: "1px dashed rgba(13,42,26,0.22)" }}>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel noMargin>Recent Queries</SectionLabel>
                <span className="inline-flex items-center gap-1.5">
                  <LiveDot color="#2e7d5b" />
                  <span style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: "9.5px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#2e7d5b",
                    fontWeight: 700
                  }}>Live</span>
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { t: "02m", q: "Gratuity after 10 years · § 2(10)" },
                  { t: "14m", q: "Overtime rate — factory · § 108" },
                ].map((row) => (
                  <div key={row.q} className="flex items-center gap-3" style={{
                    fontFamily: "var(--font-poppins), sans-serif",
                    fontSize: "11.5px",
                    color: "rgba(13,42,26,0.78)"
                  }}>
                    <span style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: "9.5px",
                      letterSpacing: "0.12em",
                      color: "#b25c22",
                      minWidth: 32,
                      fontWeight: 700
                    }}>{row.t}</span>
                    <span style={{
                      width: 12, height: 1,
                      background: "rgba(13,42,26,0.3)",
                      flexShrink: 0
                    }} />
                    <span className="truncate">{row.q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer: folio number + "Try yours" */}
            <div className="pt-4 flex items-center justify-between" style={{
              borderTop: "1px solid rgba(13,42,26,0.12)"
            }}>
              <div className="flex items-center gap-3">
                <span style={{
                  fontFamily: "var(--font-fraunces), serif",
                  fontStyle: "italic",
                  fontSize: "18px",
                  color: "#b25c22",
                  fontWeight: 600,
                  fontVariationSettings: '"opsz" 24, "SOFT" 100',
                  lineHeight: 1
                }}>pg. 01</span>
                <span style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  color: "rgba(13,42,26,0.55)"
                }}>
                  Updated 02h · EN / বাংলা
                </span>
              </div>
              <Link href="/chat" className="inline-flex items-center gap-1 group" style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#b25c22",
                fontWeight: 700,
                borderBottom: "1px dotted #b25c22",
                paddingBottom: 1
              }}>
                Try yours
                <ArrowRight style={{ width: 10, height: 10 }} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Floating searches counter — inverted contrast (dark on parchment) */}
          <div className="hidden lg:flex absolute bottom-6 left-6 items-center gap-2.5 px-4 py-2.5 z-20" style={{
            background: "#0d2a1a",
            border: "1px solid rgba(178,92,34,0.5)",
            boxShadow: "0 14px 40px -10px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)"
          }}>
            <span style={{
              fontFamily: "var(--font-fraunces), serif",
              fontStyle: "italic",
              fontSize: "1rem",
              color: "#f0e8d8",
              fontWeight: 600,
              fontVariationSettings: '"opsz" 24, "SOFT" 100'
            }}>5,482</span>
            <span style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "9.5px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(240,232,216,0.65)"
            }}>searches / wk</span>
          </div>
        </div>

      </div>

      {/* ═══ BOTTOM TICKER BAR — continuous citation marquee ═══ */}
      <div className="relative hero-marquee" style={{
        background: "linear-gradient(180deg, #07180d 0%, #050f08 100%)",
        borderTop: "1px solid rgba(178,92,34,0.3)"
      }}>
        <div className="hero-marquee-track py-3 sm:py-4">
          {[0, 1].map((copy) => (
            <div key={copy} className="hero-marquee-group" aria-hidden={copy === 1}>
              {HERO_MARQUEE_ITEMS.map((item, i) => (
                <span key={`${copy}-${i}`} className="hero-marquee-item">
                  <span className="hero-marquee-label">{item}</span>
                  <span className="hero-marquee-sep" aria-hidden>§</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Local keyframes + approved button styles (global, scoped to .hero-folio) */}
      <style>{heroFolioStyles}</style>
    </section>
  );
}

function TickerItem({ label, sub }: { label: string; sub: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap shrink-0">
      <span style={{ color: "rgba(157,219,184,0.75)", fontWeight: 600, letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ color: "rgba(240,232,216,0.35)" }}>{sub}</span>
    </span>
  );
}

function TickerDiamond() {
  return (
    <span
      className="inline-block"
      style={{
        width: 4, height: 4,
        transform: "rotate(45deg)",
        background: "rgba(211,128,68,0.4)"
      }}
      aria-hidden
    />
  );
}

// ═════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════

function CornerCross({
  className,
  tone,
  corner
}: {
  className?: string;
  tone: "ivory" | "ink";
  corner: "tl" | "tr" | "bl" | "br";
}) {
  const color = tone === "ivory" ? "rgba(240,232,216,0.35)" : "rgba(13,42,26,0.4)";
  const borders: Record<string, React.CSSProperties> = {
    tl: { borderLeft: `1px solid ${color}`, borderTop: `1px solid ${color}` },
    tr: { borderRight: `1px solid ${color}`, borderTop: `1px solid ${color}` },
    bl: { borderLeft: `1px solid ${color}`, borderBottom: `1px solid ${color}` },
    br: { borderRight: `1px solid ${color}`, borderBottom: `1px solid ${color}` }
  };
  return (
    <span aria-hidden className={className} style={{
      width: "14px", height: "14px", display: "inline-block",
      ...borders[corner]
    }}>
      <span className="block relative w-full h-full">
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{
          height: "1px", background: color
        }} />
        <span className="absolute inset-y-0 left-1/2 -translate-x-1/2" style={{
          width: "1px", background: color
        }} />
      </span>
    </span>
  );
}

function WaxSeal() {
  return (
    <span aria-hidden className="relative inline-flex items-center justify-center" style={{
      width: "22px", height: "22px", borderRadius: "50%",
      background: "radial-gradient(circle at 35% 28%, #d14530 0%, #a73423 45%, #7a1f15 100%)",
      boxShadow: "0 2px 5px rgba(122,31,21,0.35), inset 0 1px 1.5px rgba(255,255,255,0.35), inset 0 -1px 1px rgba(0,0,0,0.25)"
    }}>
      <span style={{
        fontFamily: "var(--font-fraunces), serif",
        fontStyle: "italic",
        fontSize: "11px",
        color: "rgba(253,230,203,0.85)",
        fontWeight: 600,
        lineHeight: 1,
        textShadow: "0 0.5px 0 rgba(0,0,0,0.3)"
      }}>§</span>
    </span>
  );
}

function LiveDot({ color = "#4ade80" }: { color?: string }) {
  return (
    <span className="relative inline-flex size-1.5 shrink-0">
      <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ background: color }} />
      <span className="relative inline-flex size-1.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

function SectionLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <div style={{
      fontFamily: "var(--font-jetbrains), monospace",
      fontSize: "10px",
      letterSpacing: "0.26em",
      textTransform: "uppercase",
      color: "#b25c22",
      fontWeight: 700,
      marginBottom: noMargin ? 0 : "9px"
    }}>
      {children}
    </div>
  );
}

function AttrRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="flex-1">
        <div style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: "10px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(13,42,26,0.55)",
          marginBottom: "2px",
          fontWeight: 600
        }}>{label}</div>
        <p style={{
          fontFamily: "var(--font-poppins), sans-serif",
          fontSize: "12.5px",
          lineHeight: 1.48,
          color: "rgba(13,42,26,0.82)"
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}

