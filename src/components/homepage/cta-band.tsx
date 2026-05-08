"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export function CtaBand() {
  const { t } = useLanguage();

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-20">
        <div className="hp-marker mb-6 hp-reveal" style={{ color: "var(--hp-ink-muted)" }}>
          <span className="hp-marker-rule" />
          <span className="hp-marker-section">§ 10</span>
          <span className="hp-marker-label">— The Opening</span>
          <span className="hp-marker-tail" />
        </div>

        <div className="relative overflow-hidden hp-reveal hp-reveal-1" style={{
          border: "1px solid rgba(240,232,216,0.1)",
        }}>
          {/* Dark forest background */}
          <div aria-hidden className="absolute inset-0" style={{
            background: "linear-gradient(125deg, #071a0e 0%, #0d2618 35%, #112015 65%, #070f09 100%)"
          }} />

          {/* Grain */}
          <div aria-hidden className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "180px 180px"
          }} />

          {/* Subtle grid */}
          <div aria-hidden className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "linear-gradient(rgba(248,241,228,0.4) 1px, transparent 1px)",
            backgroundSize: "auto 48px"
          }} />

          {/* Law sign watermark */}
          <div aria-hidden className="absolute right-6 top-6 w-40 h-36 pointer-events-none hidden md:block" style={{
            background: "rgba(157,219,184,0.06)",
            WebkitMaskImage: "url('/law-sign.svg')",
            maskImage: "url('/law-sign.svg')",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            transform: "rotate(-6deg)"
          }} />

          {/* Moss orb */}
          <div aria-hidden className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-25 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, #2e7d5b, transparent)" }} />

          {/* Vertical rule */}
          <div aria-hidden className="absolute left-1/2 top-10 bottom-10 w-px hidden lg:block pointer-events-none"
            style={{ background: "rgba(248,241,228,0.07)" }} />

          {/* Content */}
          <div className="relative px-8 py-14 lg:py-16 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              {/* Left — headline */}
              <div>
                <div className="mb-6 inline-flex items-center gap-2" style={{
                  fontFamily: "var(--hp-mono)", fontSize: 10, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: "rgba(240,232,216,0.55)"
                }}>
                  <span className="inline-block h-px w-7" style={{ background: "rgba(240,232,216,0.3)" }} />
                  <span style={{ color: "#9ddbb8" }}>§ 10</span>
                  <span>— Get Started</span>
                </div>

                <h2 style={{
                  fontFamily: "var(--hp-display)",
                  fontWeight: 400,
                  fontSize: "clamp(2rem, 5vw, 3.2rem)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.08,
                  color: "#f3ebdb",
                  fontVariationSettings: '"opsz" 72, "SOFT" 30'
                }}>
                  {t("home.cta.headline")}
                </h2>

                <p style={{
                  maxWidth: "42ch",
                  marginTop: "1.25rem",
                  fontFamily: "var(--hp-italic)",
                  fontStyle: "italic",
                  fontSize: "1.05rem",
                  lineHeight: 1.65,
                  color: "rgba(240,232,216,0.55)",
                  fontVariationSettings: '"opsz" 20'
                }}>
                  {t("home.cta.subline")}
                </p>
              </div>

              {/* Right — actions + social proof */}
              <div className="flex flex-col gap-6 lg:pl-10">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5"
                    style={{
                      background: "linear-gradient(180deg, #3c9b6f 0%, #1f5a43 100%)",
                      border: "1px solid #1f5a43",
                      color: "#fafaf5",
                      fontFamily: "var(--hp-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 10px 24px -14px rgba(46, 125, 91, 0.5)"
                    }}
                  >
                    {t("home.cta.ctaPrimary")}
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Link
                    href="#pricing"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(240,232,216,0.15)",
                      color: "rgba(240,232,216,0.72)",
                      fontFamily: "var(--hp-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase"
                    }}
                  >
                    {t("home.cta.ctaSecondary")}
                  </Link>
                </div>

                {/* Social proof micro-stats */}
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3 pt-2" style={{
                  borderTop: "1px solid rgba(240,232,216,0.08)",
                  paddingTop: "1rem"
                }}>
                  {[
                    { value: "1,206", label: "sections indexed" },
                    { value: "Free", label: "to get started" },
                    { value: "EN/BN", label: "bilingual" },
                  ].map(({ value, label }) => (
                    <div key={label} className="flex items-baseline gap-2">
                      <span style={{
                        fontFamily: "var(--hp-display)",
                        fontSize: "1.25rem",
                        fontWeight: 400,
                        color: "#9ddbb8",
                        letterSpacing: "-0.02em",
                        fontVariationSettings: '"opsz" 36, "SOFT" 100'
                      }}>
                        {value}
                      </span>
                      <span style={{
                        fontFamily: "var(--hp-mono)",
                        fontSize: 9.5,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "rgba(240,232,216,0.4)"
                      }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
