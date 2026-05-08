"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowRight, X } from "lucide-react";

import "@/components/landing/landing.css";

const CONSENT_KEY = "llp-cookie-consent";

export function CookieBanner() {
  const { resolvedTheme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    setMounted(true);
    const consent =
      typeof window !== "undefined"
        ? localStorage.getItem(CONSENT_KEY)
        : null;
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  const close = (choice: "accepted" | "declined") => {
    localStorage.setItem(CONSENT_KEY, choice);
    setDismissing(true);
    setTimeout(() => setVisible(false), 320);
  };

  if (!mounted || !visible) return null;

  const themeAttr = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div
      className="lf-page cookie-dock"
      data-theme={themeAttr}
      data-dismissing={dismissing ? "true" : "false"}
      suppressHydrationWarning
    >
      <div
        role="dialog"
        aria-label="Privacy consent notice"
        aria-live="polite"
        className="lf-card cookie-card"
      >
        {/* Atmospheric aura */}
        <span aria-hidden className="cookie-aura" />

        {/* Hairline grid */}
        <span aria-hidden className="cookie-grid" />

        {/* Oversized § watermark */}
        <span aria-hidden className="cookie-watermark">§</span>

        {/* Corner trim marks */}
        <span aria-hidden className="cookie-trim cookie-trim--tl" />
        <span aria-hidden className="cookie-trim cookie-trim--tr" />
        <span aria-hidden className="cookie-trim cookie-trim--bl" />
        <span aria-hidden className="cookie-trim cookie-trim--br" />

        {/* Close × */}
        <button
          type="button"
          onClick={() => close("declined")}
          aria-label="Dismiss and decline non-essential cookies"
          className="cookie-close"
        >
          <X style={{ width: 12, height: 12 }} />
        </button>

        <div className="relative">
          {/* Top ribbon: folio + live mandate */}
          <div className="cookie-ribbon">
            <span className="lf-meta">Folio · Consent · 2026</span>
            <div className="cookie-warrant">
              <span className="cookie-pulse">
                <span className="cookie-pulse-ping" />
                <span className="cookie-pulse-dot" />
              </span>
              <span className="lf-meta lf-meta--emerald">
                Reader&rsquo;s Warrant
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="cookie-body">
            {/* Section marker */}
            <div className="lf-section-eyebrow">
              <span className="lf-section-eyebrow-rule" />
              <span className="lf-kicker">
                <span className="lf-kicker-mark">§ IX</span>
                <span>— Privacy &amp; Cookies</span>
              </span>
            </div>

            {/* Headline */}
            <h3 className="lf-h3 cookie-headline">
              A brief matter of <em>consent.</em>
            </h3>

            {/* Body copy */}
            <p className="lf-body cookie-copy">
              Labor Law Partner stores essential cookies to keep you signed in
              and to improve the Codex. We don&rsquo;t sell data. By continuing
              you acknowledge our{" "}
              <Link href="/privacy" className="cookie-inline-link">
                Privacy Policy
              </Link>
              {" · "}
              <Link href="/terms" className="cookie-inline-link">
                Terms of Service
              </Link>
              .
            </p>

            {/* Ledger strip — 3 cols */}
            <div className="cookie-ledger">
              {[
                { label: "Category", value: "Essential" },
                { label: "Store", value: "localStorage" },
                { label: "Retention", value: "365 d" },
              ].map((c) => (
                <div key={c.label} className="cookie-ledger-cell">
                  <div className="cookie-ledger-value">{c.value}</div>
                  <div className="lf-meta cookie-ledger-label">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Progress segments */}
            <div className="cookie-segments" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className={`cookie-segment${i < 13 ? " cookie-segment--on" : ""}`}
                />
              ))}
            </div>

            {/* Action row */}
            <div className="cookie-actions">
              <button
                type="button"
                onClick={() => close("declined")}
                className="lf-cta lf-cta--ghost cookie-cta"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => close("accepted")}
                className="lf-cta lf-cta--primary cookie-cta cookie-cta--accept group"
              >
                Accept &amp; continue
                <ArrowRight
                  style={{ width: 13, height: 13, marginLeft: 6 }}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>

            {/* Footer meta */}
            <div className="cookie-footer">
              <span className="lf-meta">Sealed · Dhaka · 2026</span>
              <span className="lf-meta">EN / বাংলা</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cookie-dock {
          /* Reset .lf-page chrome — only inherit tokens */
          min-height: 0 !important;
          background: none !important;
          overflow-x: visible !important;
          color: inherit;
          font-family: var(--lf-body);

          position: fixed;
          left: clamp(12px, 2.5vw, 28px);
          bottom: clamp(12px, 2.5vw, 28px);
          right: clamp(12px, 2.5vw, 28px);
          width: auto;
          height: auto;
          z-index: 50;
          display: flex;
          justify-content: flex-start;
          pointer-events: none;
          animation: cookieEdictIn 540ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .cookie-dock[data-dismissing="true"] {
          animation: cookieEdictOut 320ms cubic-bezier(0.4, 0, 1, 1) both;
        }
        .cookie-card {
          position: relative;
          overflow: hidden;
          pointer-events: auto;
          width: 100%;
          max-width: 440px;
          padding: 0;
          /* Solid paper base — modal-class readability over busy page bg */
          background: var(--paper) !important;
          background-image:
            linear-gradient(
              180deg,
              color-mix(in oklab, var(--paper) 96%, var(--accent-blue) 4%) 0%,
              var(--paper) 100%
            ) !important;
          border: 1px solid color-mix(in oklab, var(--ink) 14%, transparent) !important;
          box-shadow:
            0 1px 0 color-mix(in oklab, var(--paper) 80%, white) inset,
            0 36px 90px -22px color-mix(in oklab, var(--ink) 38%, transparent),
            0 12px 32px -16px color-mix(in oklab, var(--ink) 22%, transparent) !important;
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
        }
        @media (min-width: 640px) {
          .cookie-dock {
            right: auto;
          }
        }

        /* Decorative layers */
        .cookie-aura {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse 70% 55% at 20% 10%,
              color-mix(in oklab, var(--accent-blue) 14%, transparent) 0%,
              transparent 65%
            ),
            radial-gradient(
              ellipse 55% 40% at 90% 100%,
              color-mix(in oklab, var(--bronze) 10%, transparent) 0%,
              transparent 60%
            );
        }
        .cookie-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(var(--line-1) 1px, transparent 1px),
            linear-gradient(90deg, var(--line-1) 1px, transparent 1px);
          background-size: 52px 52px;
          opacity: 0.45;
        }
        .cookie-watermark {
          pointer-events: none;
          position: absolute;
          top: -18px;
          right: -6px;
          user-select: none;
          font-family: var(--lf-display);
          font-style: italic;
          font-size: 220px;
          line-height: 0.85;
          letter-spacing: -0.05em;
          color: color-mix(in oklab, var(--accent-blue) 9%, transparent);
          font-variation-settings: "opsz" 144, "SOFT" 100;
          display: none;
        }
        @media (min-width: 640px) {
          .cookie-watermark { display: block; }
        }

        /* Corner trim marks */
        .cookie-trim {
          position: absolute;
          width: 12px;
          height: 12px;
          pointer-events: none;
        }
        .cookie-trim--tl {
          top: 8px; left: 8px;
          border-left: 1px solid color-mix(in oklab, var(--accent-blue) 55%, var(--glass-border));
          border-top: 1px solid color-mix(in oklab, var(--accent-blue) 55%, var(--glass-border));
        }
        .cookie-trim--tr {
          top: 8px; right: 8px;
          border-right: 1px solid color-mix(in oklab, var(--accent-blue) 55%, var(--glass-border));
          border-top: 1px solid color-mix(in oklab, var(--accent-blue) 55%, var(--glass-border));
        }
        .cookie-trim--bl {
          bottom: 8px; left: 8px;
          border-left: 1px solid color-mix(in oklab, var(--accent-blue) 55%, var(--glass-border));
          border-bottom: 1px solid color-mix(in oklab, var(--accent-blue) 55%, var(--glass-border));
        }
        .cookie-trim--br {
          bottom: 8px; right: 8px;
          border-right: 1px solid color-mix(in oklab, var(--accent-blue) 55%, var(--glass-border));
          border-bottom: 1px solid color-mix(in oklab, var(--accent-blue) 55%, var(--glass-border));
        }

        /* Close button */
        .cookie-close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          color: var(--ink-4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: background 180ms ease, color 180ms ease, transform 180ms ease;
        }
        .cookie-close:hover {
          background: var(--glass-bg-strong);
          color: var(--ink-2);
          transform: scale(1.05);
        }

        /* Top ribbon */
        .cookie-ribbon {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid var(--line-1);
        }
        .cookie-warrant {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding-right: 28px;
        }
        .cookie-pulse {
          position: relative;
          display: inline-flex;
          width: 6px;
          height: 6px;
        }
        .cookie-pulse-ping {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: var(--emerald);
          opacity: 0.7;
          animation: cookiePulse 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .cookie-pulse-dot {
          position: relative;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--emerald);
        }

        /* Body */
        .cookie-body {
          padding: 16px 20px 18px;
        }
        .cookie-headline {
          margin: 12px 0 10px;
        }
        :global(.lf-page) .cookie-headline em {
          font-style: italic;
          color: var(--accent-blue);
          font-variation-settings: "opsz" 72, "SOFT" 100;
        }
        .cookie-copy {
          margin-bottom: 14px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink-3);
        }
        :global(.lf-page) .cookie-inline-link {
          color: var(--ink-2);
          text-decoration: underline;
          text-decoration-color: color-mix(in oklab, var(--accent-blue) 55%, transparent);
          text-decoration-style: dotted;
          text-decoration-thickness: 1px;
          text-underline-offset: 3px;
          transition: color 160ms ease, text-decoration-style 160ms ease;
        }
        :global(.lf-page) .cookie-inline-link:hover {
          color: var(--accent-blue);
          text-decoration-style: solid;
        }

        /* Ledger strip */
        .cookie-ledger {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          margin-bottom: 14px;
          border-top: 1px solid var(--line-1);
          border-bottom: 1px solid var(--line-1);
        }
        .cookie-ledger-cell {
          padding: 10px 6px;
          text-align: center;
          border-left: 1px solid var(--line-1);
        }
        .cookie-ledger-cell:first-child {
          border-left: none;
        }
        .cookie-ledger-value {
          font-family: var(--lf-display);
          font-weight: 500;
          font-size: 0.92rem;
          line-height: 1;
          color: var(--ink);
          letter-spacing: -0.01em;
          font-variation-settings: "opsz" 28;
        }
        .cookie-ledger-label {
          margin-top: 4px;
          font-size: 8.5px;
          letter-spacing: 0.22em;
        }

        /* Progress segments */
        .cookie-segments {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 16px;
        }
        .cookie-segment {
          flex: 1;
          height: 2px;
          background: var(--line-1);
          border-radius: 1px;
        }
        .cookie-segment--on {
          background: var(--accent-blue);
        }

        /* Action row */
        .cookie-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        :global(.lf-page) .cookie-cta {
          padding: 10px 18px;
          font-size: 11px;
        }
        :global(.lf-page) .cookie-cta--accept {
          flex: 1 1 auto;
          justify-content: center;
        }

        /* Footer meta */
        .cookie-footer {
          margin-top: 14px;
          padding-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px dashed var(--line-1);
        }

        @keyframes cookieEdictIn {
          0% {
            opacity: 0;
            transform: translateY(36px) scale(0.985);
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes cookieEdictOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
        }
        @keyframes cookiePulse {
          0% { transform: scale(1); opacity: 0.7; }
          80%, 100% { transform: scale(2.4); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cookie-dock,
          .cookie-dock[data-dismissing="true"] {
            animation: none !important;
          }
          .cookie-pulse-ping {
            animation: none !important;
          }
          .cookie-close:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
