"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { useLanguage } from "@/hooks/use-language";
import "@/components/landing/landing.css";
import "./academy-styles.css";

/* ──────────────────────────────────────────────────────────────────── */
/*  Inline arrow icon — matches v56 (line + polyline, stroke-2, round)  */
/* ──────────────────────────────────────────────────────────────────── */

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Static config                                                       */
/* ──────────────────────────────────────────────────────────────────── */

const METHOD_STATS = [1, 2, 3, 4] as const;
const PF_ARTIFACTS = [1, 2, 3, 4, 5] as const;
const FIVE_S_LETTERS = [1, 2, 3, 4, 5] as const;
const AGARS_LETTERS = [1, 2, 3, 4, 5] as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  Section meta — render with bold "1 of 3" middle                     */
/* ──────────────────────────────────────────────────────────────────── */

function renderTopicsMeta(raw: string) {
  // Match "1 of 3" (or any "<digit> of <digit>") and wrap it in <strong>
  const match = raw.match(/(\d+\s+of\s+\d+|\d+টির\s+মধ্যে\s+\d+টি|\d+\s*\/\s*\d+)/);
  if (!match || match.index === undefined) {
    return raw;
  }
  const before = raw.slice(0, match.index);
  const after = raw.slice(match.index + match[0].length);
  return (
    <>
      {before}
      <strong>{match[0]}</strong>
      {after}
    </>
  );
}

function renderStampLine(raw: string) {
  // Wrap "Mehnaz Islam" or "মেহনাজ ইসলাম" in <strong>
  const re = /(Mehnaz Islam|মেহনাজ ইসলাম)/;
  const match = raw.match(re);
  if (!match || match.index === undefined) return raw;
  const before = raw.slice(0, match.index);
  const after = raw.slice(match.index + match[0].length);
  return (
    <>
      {before}
      <strong>{match[0]}</strong>
      {after}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Main component                                                      */
/* ──────────────────────────────────────────────────────────────────── */

export function AcademyContent() {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();

  // Avoid hydration flash — only commit theme attribute after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "light";

  const handleNotify = (topic: string) => {
    if (typeof window !== "undefined") {
      window.alert(`We will notify you when ${topic} Path launches.`);
    }
  };

  return (
    <div className="lf-page" data-theme={themeAttr}>
      <SiteTopNav />

      <main className="lf-pc-main">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="lf-pc-hero">
          <div className="lf-pc-badge">
            <span className="lf-pc-badge-dot" />
            <span className="lf-pc-badge-text">
              {t("academy.hero.badge")}
            </span>
          </div>

          <h1 className="lf-pc-hero-title">
            {t("academy.hero.titleLead")}{" "}
            <em>{t("academy.hero.titleAccent")}</em>.
          </h1>

          <p className="lf-pc-hero-deck">{t("academy.hero.deck")}</p>
        </section>

        {/* ── Method strip — 4 stats ────────────────────────── */}
        <div className="lf-pc-method-strip-wrap">
          <div className="lf-pc-method-strip">
            {METHOD_STATS.map((i) => (
              <div className="lf-pc-method-item" key={i}>
                <div className="lf-pc-method-big">
                  {t(`academy.method.s${i}.big`)}
                </div>
                <div className="lf-pc-method-label">
                  {t(`academy.method.s${i}.label`)}
                </div>
                <div className="lf-pc-method-sub">
                  {t(`academy.method.s${i}.sub`)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Topics ────────────────────────────────────────── */}
        <section className="lf-pc-section">
          <div className="lf-pc-section-head">
            <div className="lf-pc-section-head-left">
              <div className="lf-pc-section-kicker">
                {t("academy.topics.kicker")}
              </div>
              <h2 className="lf-pc-section-title">
                {t("academy.topics.titleLead")}{" "}
                <em>{t("academy.topics.titleAccent")}</em>
              </h2>
              <p className="lf-pc-section-deck">
                {t("academy.topics.deck")}
              </p>
            </div>
            <div className="lf-pc-section-meta">
              {renderTopicsMeta(t("academy.topics.meta"))}
            </div>
          </div>

          <div className="lf-pc-topics">
            {/* Topic 1: PF (live) — featured 2-column */}
            <Link
              href="/academy/pf"
              className="lf-pc-topic-card lf-pc-topic-card--featured"
            >
              <div className="lf-pc-topic-left">
                <div className="lf-pc-topic-head">
                  <span className="lf-pc-topic-badge lf-pc-topic-badge--live">
                    {t("academy.path.pf.badge")}
                  </span>
                  <span className="lf-pc-topic-meta-inline">
                    {t("academy.path.pf.metaInline")}
                  </span>
                </div>
                <h3 className="lf-pc-topic-title">
                  {t("academy.path.pf.titleLead")}{" "}
                  <em>{t("academy.path.pf.titleAccent")}</em>.
                </h3>
                <p className="lf-pc-topic-sub">
                  {t("academy.path.pf.sub")}
                </p>
              </div>
              <div className="lf-pc-topic-right">
                <div>
                  <div className="lf-pc-topic-artifacts-label">
                    {t("academy.path.pf.artifactsLabel")}
                  </div>
                  <div className="lf-pc-topic-artifacts">
                    {PF_ARTIFACTS.map((i) => (
                      <span className="lf-pc-topic-artifact" key={i}>
                        {t(`academy.path.pf.artifact${i}`)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="lf-pc-topic-cta-row">
                  <span className="lf-pc-topic-cta">
                    {t("academy.path.pf.cta")}
                    <ArrowRightIcon />
                  </span>
                  <span className="lf-pc-topic-cta-meta">
                    {t("academy.path.pf.session1Free")}
                  </span>
                </div>
              </div>
            </Link>

            {/* Topic 2: Gratuity (in review) — single column */}
            <div className="lf-pc-topic-card">
              <div className="lf-pc-topic-head">
                <span className="lf-pc-topic-badge lf-pc-topic-badge--authoring">
                  {t("academy.path.gratuity.badge")}
                </span>
                <span className="lf-pc-topic-meta-inline">
                  {t("academy.path.gratuity.metaInline")}
                </span>
              </div>
              <h3 className="lf-pc-topic-title">
                {t("academy.path.gratuity.titleLead")}{" "}
                <em>{t("academy.path.gratuity.titleAccent")}</em>.
              </h3>
              <p className="lf-pc-topic-sub">
                {t("academy.path.gratuity.sub")}
              </p>
              <div className="lf-pc-topic-cta-row">
                <button
                  type="button"
                  className="lf-pc-topic-notify"
                  onClick={() => handleNotify("Gratuity")}
                >
                  {t("academy.path.gratuity.notify")}
                </button>
              </div>
            </div>

            {/* Topic 3: Domestic Enquiry (coming) — single column */}
            <div className="lf-pc-topic-card">
              <div className="lf-pc-topic-head">
                <span className="lf-pc-topic-badge lf-pc-topic-badge--coming">
                  {t("academy.path.enquiry.badge")}
                </span>
                <span className="lf-pc-topic-meta-inline">
                  {t("academy.path.enquiry.metaInline")}
                </span>
              </div>
              <h3 className="lf-pc-topic-title">
                {t("academy.path.enquiry.titleLead")}{" "}
                <em>{t("academy.path.enquiry.titleAccent")}</em>.
              </h3>
              <p className="lf-pc-topic-sub">
                {t("academy.path.enquiry.sub")}
              </p>
              <div className="lf-pc-topic-cta-row">
                <button
                  type="button"
                  className="lf-pc-topic-notify"
                  onClick={() => handleNotify("Domestic Enquiry")}
                >
                  {t("academy.path.enquiry.notify")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Methodology — 5S Foundation + AGARS Refresh ─── */}
        <section className="lf-pc-section">
          <div className="lf-pc-section-head">
            <div className="lf-pc-section-head-left">
              <div className="lf-pc-section-kicker">
                {t("academy.method.kicker")}
              </div>
              <h2 className="lf-pc-section-title">
                {t("academy.method.titleLead")}{" "}
                <em>{t("academy.method.titleAccent")}</em>
              </h2>
              <p className="lf-pc-section-deck">
                {t("academy.method.deck")}
              </p>
            </div>
          </div>

          <div className="lf-pc-method-block">
            <div className="lf-pc-method-block-left">
              <h3 className="lf-pc-method-block-title">
                {t("academy.method.s5s.title")}
              </h3>
              <p className="lf-pc-method-block-desc">
                {t("academy.method.s5s.desc")}
              </p>
              <div className="lf-pc-method-block-letters">
                {FIVE_S_LETTERS.map((i) => (
                  <span className="lf-pc-method-letter" key={i}>
                    {t(`academy.method.s5s.l${i}`)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="lf-pc-method-block-title">
                {t("academy.method.agars.title")}
              </h3>
              <p className="lf-pc-method-block-desc">
                {t("academy.method.agars.desc")}
              </p>
              <div className="lf-pc-method-block-letters">
                {AGARS_LETTERS.map((i) => (
                  <span className="lf-pc-method-letter" key={i}>
                    {t(`academy.method.agars.l${i}`)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stamp footer ──────────────────────────────────── */}
        <div className="lf-pc-stamp">
          <span>{renderStampLine(t("academy.stamp.line"))}</span>
          <div className="lf-pc-stamp-right">
            <span>{t("academy.stamp.foundation")}</span>
            <span>{t("academy.stamp.content")}</span>
          </div>
        </div>
      </main>

      <HomepageFooter />
    </div>
  );
}
