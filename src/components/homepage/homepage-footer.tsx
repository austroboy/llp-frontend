"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/site/site-top-nav";
import { useLanguage } from "@/hooks/use-language";

const FOOTER_LABEL_ID = "footer-brand-label";

type Stamp = {
  isoFull: string;
  yearFull: string;
};

export function HomepageFooter() {
  const { t } = useLanguage();
  const [stamp, setStamp] = useState<Stamp | null>(null);

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setStamp({
      isoFull: `${y}.${mm}.${dd}`,
      yearFull: String(y),
    });
  }, []);

  const columns: { titleKey: string; links: { labelKey: string; href: string }[] }[] = [
    {
      titleKey: "home.footer.product",
      links: [
        { labelKey: "home.footer.documents", href: "/documents" },
        { labelKey: "home.footer.experts", href: "/experts" },
        { labelKey: "home.footer.pricing", href: "/#pricing" },
      ],
    },
    {
      titleKey: "home.footer.platform",
      links: [
        { labelKey: "home.footer.servicesDesk", href: "/services" },
        { labelKey: "home.footer.academy", href: "/academy" },
        { labelKey: "home.footer.headhunting", href: "/headhunting" },
        { labelKey: "home.footer.resources", href: "/resources" },
      ],
    },
    {
      titleKey: "home.footer.company",
      links: [
        { labelKey: "home.footer.about", href: "/about" },
        { labelKey: "home.footer.contact", href: "/contact" },
        { labelKey: "home.footer.blog", href: "/blog" },
      ],
    },
    {
      titleKey: "home.footer.register",
      links: [
        { labelKey: "home.nav.signIn", href: "/sign-in" },
        { labelKey: "home.nav.signUp", href: "/sign-up" },
        { labelKey: "home.footer.trackRequest", href: "/#track" },
        { labelKey: "home.footer.pricing", href: "/#pricing" },
      ],
    },
  ];

  return (
    <footer aria-labelledby={FOOTER_LABEL_ID} className="lf-footer">
      <HomepageFooterStyles />

      {/* Top ornamental rule: hairline · fleuron · hairline */}
      <div className="lf-footer-ornament" aria-hidden>
        <span className="lf-footer-ornament-rule" />
        <span className="lf-footer-ornament-fleuron">◆</span>
        <span className="lf-footer-ornament-rule" />
      </div>

      <div className="lf-footer-inner">
        {/* Brand panel + 4 link columns */}
        <div className="lf-footer-registry" aria-label="Footer navigation">
          <div className="lf-footer-brand-panel">
            <Link
              href="/"
              className="lf-footer-brand"
              aria-label="Labor Law Partner — home"
            >
              <BrandMark size={28} />
              <span id={FOOTER_LABEL_ID} className="lf-footer-brand-name">
                Labor Law Partner
              </span>
            </Link>
            <p className="lf-footer-brand-desc">
              Bangladesh labor and compliance law, made workable. Honest about
              depth. Careful about citations. Built for close reading.
            </p>
            <div className="lf-footer-team">
              <div className="lf-footer-team-label">The Lab</div>
              <p className="lf-footer-team-line">
                <em>Led by</em> <strong>Tanbhir Siddiki</strong> ·{" "}
                <em>Editorial</em> <strong>Mehnaz Islam</strong> ·{" "}
                <em>Operations</em> <strong>Shumon Ahmed</strong> <em>and</em>{" "}
                <strong>Muhib Hossain</strong> · <em>Technology</em>{" "}
              </p>
            </div>
          </div>

          {columns.map((col) => (
            <nav
              key={col.titleKey}
              className="lf-footer-col"
              aria-label={t(col.titleKey)}
            >
              <div className="lf-footer-col-head">
                <h4 className="lf-footer-col-title">{t(col.titleKey)}</h4>
              </div>
              <ul className="lf-footer-col-list">
                {col.links.map((link) => (
                  <li key={link.labelKey}>
                    <Link href={link.href} className="lf-footer-link">
                      <span className="lf-footer-link-text">
                        {t(link.labelKey)}
                      </span>
                      <span className="lf-footer-link-glyph" aria-hidden>
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Copyright + legal triad */}
        <div className="lf-footer-bottom">
          <p className="lf-footer-copyright">
            <span aria-hidden>©</span>{" "}
            <span suppressHydrationWarning>
              {stamp?.yearFull ?? new Date().getFullYear()}
            </span>
            {" · Labor Law Partner · "}
            {t("home.footer.allInstruments")}
          </p>
          <div className="lf-footer-triad">
            <Link href="/privacy" className="lf-footer-triad-link">
              {t("home.footer.privacy")}
            </Link>
            <span className="lf-footer-triad-dot" aria-hidden>
              ·
            </span>
            <Link href="/terms" className="lf-footer-triad-link">
              {t("home.footer.terms")}
            </Link>
            <span className="lf-footer-triad-dot" aria-hidden>
              ·
            </span>
            <Link href="/#cookies" className="lf-footer-triad-link">
              {t("home.footer.cookies")}
            </Link>
          </div>
        </div>
      </div>

      {/* ISSN serial */}
      <div className="lf-footer-tail" aria-hidden>
        <span className="lf-footer-issn" suppressHydrationWarning>
          {stamp ? `ISSN LLP-${stamp.isoFull}` : "ISSN LLP-\u00a0"}
        </span>
      </div>

      {/* Physical close: hairline above, accent glow below */}
      <div className="lf-footer-close" aria-hidden />
    </footer>
  );
}

function HomepageFooterStyles() {
  return <style>{FTR_CSS}</style>;
}

const FTR_CSS = `
.lf-footer {
  /* Token alias chain: prefer lf-* tokens, fall back to hp-* on legacy pages */
  --ftr-ink:        var(--ink, var(--hp-ink, #1a1815));
  --ftr-ink-2:      var(--ink-2, var(--hp-ink, #2c2a26));
  --ftr-ink-3:      var(--ink-3, var(--hp-ink-muted, #55534d));
  --ftr-ink-4:      var(--ink-4, var(--hp-ink-faint, #7a7870));
  --ftr-line:       var(--line-1, var(--hp-rule, rgba(20,20,19,0.06)));
  --ftr-line-2:     var(--line-2, var(--hp-rule-strong, rgba(20,20,19,0.12)));
  --ftr-accent:     var(--accent-blue, var(--hp-rust, #1e3a5f));
  --ftr-display:    var(--lf-display, var(--hp-display, "Source Serif 4", Georgia, serif));
  --ftr-body:       var(--lf-body, var(--hp-body, system-ui, sans-serif));
  --ftr-mono:       var(--lf-mono, var(--hp-mono, ui-monospace, monospace));
  --ftr-glass-bg:   var(--glass-bg, transparent);
  --ftr-glass-bord: var(--glass-border, var(--hp-rule, rgba(20,20,19,0.06)));

  position: relative;
  margin-top: 64px;
  padding: 28px 0 0;
  background: linear-gradient(180deg,
    transparent 0%,
    color-mix(in oklab, var(--ftr-accent) 4%, transparent) 100%);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  border-top: 1px solid var(--ftr-glass-bord);
}

/* ── Top ornamental rule ── */
.lf-footer-ornament {
  display: flex;
  align-items: center;
  gap: 18px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px 28px;
}
@media (min-width: 1024px) {
  .lf-footer-ornament { padding-left: 48px; padding-right: 48px; gap: 22px; }
}
.lf-footer-ornament-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--ftr-line-2) 28%,
    var(--ftr-line-2) 72%,
    transparent 100%);
}
.lf-footer-ornament-fleuron {
  font-family: var(--ftr-display);
  font-size: 13px;
  color: var(--ftr-accent);
  font-variation-settings: "opsz" 48, "SOFT" 100;
  line-height: 1;
  transform: translateY(-1px);
  user-select: none;
}

/* ── Body ── */
.lf-footer-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px 36px;
}
@media (min-width: 1024px) {
  .lf-footer-inner { padding-left: 48px; padding-right: 48px; padding-bottom: 44px; }
}

/* ── Registry: brand panel + 4 cols ── */
.lf-footer-registry {
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px 24px;
  padding-bottom: 32px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--ftr-line);
}
@media (min-width: 640px) {
  .lf-footer-registry {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .lf-footer-brand-panel { grid-column: 1 / -1; }
}
@media (min-width: 768px) {
  .lf-footer-registry {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .lf-footer-registry {
    grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr;
    gap: 44px;
    padding-bottom: 40px;
    margin-bottom: 32px;
  }
  .lf-footer-brand-panel { grid-column: auto; }
  .lf-footer-col { position: relative; }
  .lf-footer-col + .lf-footer-col::before {
    content: "";
    position: absolute;
    left: -22px;
    top: 4px;
    bottom: 4px;
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      var(--ftr-line) 16%,
      var(--ftr-line) 84%,
      transparent 100%
    );
  }
}

/* Brand panel */
.lf-footer-brand-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: flex-start;
  max-width: 380px;
}
.lf-footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  width: max-content;
}
.lf-footer-brand:focus-visible {
  outline: 2px solid var(--ftr-accent);
  outline-offset: 4px;
  border-radius: 6px;
}
.lf-footer-brand-name {
  font-family: var(--ftr-display);
  font-weight: 500;
  font-size: 17px;
  letter-spacing: -0.006em;
  color: var(--ftr-ink);
  line-height: 1;
  white-space: nowrap;
}
.lf-footer-brand-desc {
  font-family: var(--ftr-display);
  font-style: italic;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ftr-ink-3);
  margin: 0;
}
.lf-footer-team {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 18px;
  border-top: 1px solid var(--ftr-line);
  width: 100%;
}
.lf-footer-team-label {
  font-family: var(--ftr-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ftr-accent);
  font-weight: 600;
}
.lf-footer-team-line {
  font-family: var(--ftr-display);
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--ftr-ink-3);
  margin: 0;
}
.lf-footer-team-line em {
  font-style: italic;
  color: var(--ftr-ink-4);
}
.lf-footer-team-line strong {
  font-weight: 500;
  color: var(--ftr-ink-2);
}

/* Columns */
.lf-footer-col-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ftr-line);
}
.lf-footer-col-title {
  font-family: var(--ftr-mono);
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ftr-accent);
  margin: 0;
  line-height: 1.1;
}
.lf-footer-col-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.lf-footer-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--ftr-display);
  font-size: 14px;
  letter-spacing: -0.005em;
  line-height: 1.4;
  color: var(--ftr-ink-3);
  text-decoration: none;
  padding: 2px 0;
  transition: color 200ms ease, gap 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.lf-footer-link:hover,
.lf-footer-link:focus-visible {
  color: var(--ftr-ink);
  gap: 10px;
}
.lf-footer-link:focus-visible {
  outline: 2px solid var(--ftr-accent);
  outline-offset: 3px;
  border-radius: 4px;
}
.lf-footer-link-glyph {
  display: inline-flex;
  opacity: 0;
  transform: translateX(-4px);
  font-family: var(--ftr-mono);
  font-size: 10px;
  color: var(--ftr-accent);
  line-height: 1;
  transition: opacity 220ms ease, transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.lf-footer-link:hover .lf-footer-link-glyph,
.lf-footer-link:focus-visible .lf-footer-link-glyph {
  opacity: 1;
  transform: translateX(0);
}
@media (prefers-reduced-motion: reduce) {
  .lf-footer-link,
  .lf-footer-link-glyph { transition: color 200ms ease; }
  .lf-footer-link:hover { gap: 6px; }
  .lf-footer-link:hover .lf-footer-link-glyph,
  .lf-footer-link:focus-visible .lf-footer-link-glyph {
    opacity: 1;
    transform: none;
  }
}

/* ── Copyright + legal triad ── */
.lf-footer-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
@media (min-width: 768px) {
  .lf-footer-bottom { flex-direction: row; }
}
.lf-footer-copyright {
  font-family: var(--ftr-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--ftr-ink-3);
  text-align: center;
  margin: 0;
  line-height: 1.55;
  font-variant-numeric: tabular-nums;
}
@media (min-width: 768px) {
  .lf-footer-copyright { text-align: left; }
}
.lf-footer-triad {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.lf-footer-triad-link {
  font-family: var(--ftr-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ftr-ink-3);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: color 200ms ease, border-color 200ms ease, background 200ms ease;
}
.lf-footer-triad-link:hover {
  color: var(--ftr-ink);
  border-color: color-mix(in oklab, var(--ftr-accent) 30%, var(--ftr-line-2));
  background: color-mix(in oklab, var(--ftr-accent) 6%, transparent);
}
.lf-footer-triad-link:focus-visible {
  outline: 2px solid var(--ftr-accent);
  outline-offset: 3px;
}
.lf-footer-triad-dot {
  color: var(--ftr-ink-4);
  font-size: 10px;
}

/* ── Tail: ISSN ── */
.lf-footer-tail {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px 10px;
  display: flex;
  justify-content: flex-end;
}
@media (min-width: 1024px) {
  .lf-footer-tail { padding-left: 48px; padding-right: 48px; padding-bottom: 12px; }
}
.lf-footer-issn {
  font-family: var(--ftr-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--ftr-ink) 22%, transparent);
  font-variant-numeric: tabular-nums;
}

/* ── Physical close: hairline + accent glow ── */
.lf-footer-close {
  height: 3px;
  width: 100%;
  position: relative;
}
.lf-footer-close::before,
.lf-footer-close::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
}
.lf-footer-close::before {
  top: 0;
  background: var(--ftr-line);
}
.lf-footer-close::after {
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    color-mix(in oklab, var(--ftr-accent) 50%, transparent) 30%,
    color-mix(in oklab, var(--ftr-accent) 50%, transparent) 70%,
    transparent 100%);
  filter: blur(0.4px);
}
`;
