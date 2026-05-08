"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Search, UserCheck, Headset, Network, GraduationCap, FileText, ArrowRight, ArrowUpRight, Sparkles, Check, ShieldCheck, Languages, Hash, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";

const modules = [
  {
    key: "aiSearch", n: "N° 01", icon: Search,
    badgeKey: "home.universe.aiSearch.badge",
    titleKey: "home.universe.aiSearch.title",
    descKey: "home.universe.aiSearch.desc",
    ctaKey: "home.universe.aiSearch.cta",
    href: "/chat", featured: true,
  },
  {
    key: "experts", n: "N° 02", icon: UserCheck,
    badgeKey: "home.universe.experts.badge",
    titleKey: "home.universe.experts.title",
    descKey: "home.universe.experts.desc",
    ctaKey: "home.universe.experts.cta",
    href: "/experts",
  },
  {
    key: "services", n: "N° 03", icon: Headset,
    badgeKey: "home.universe.services.badge",
    titleKey: "home.universe.services.title",
    descKey: "home.universe.services.desc",
    ctaKey: "home.universe.services.cta",
    href: "/services",
  },
  {
    key: "headhunting", n: "N° 04", icon: Network,
    badgeKey: "home.universe.headhunting.badge",
    titleKey: "home.universe.headhunting.title",
    descKey: "home.universe.headhunting.desc",
    ctaKey: "home.universe.headhunting.cta",
    href: "/headhunting",
  },
  {
    key: "academy", n: "N° 05", icon: GraduationCap,
    badgeKey: "home.universe.academy.badge",
    titleKey: "home.universe.academy.title",
    descKey: "home.universe.academy.desc",
    ctaKey: "home.universe.academy.cta",
    href: "/academy",
  },
  {
    key: "blog", n: "N° 06", icon: FileText,
    badgeKey: "home.universe.blog.badge",
    titleKey: "home.universe.blog.title",
    descKey: "home.universe.blog.desc",
    ctaKey: "home.universe.blog.cta",
    href: "/blog",
  },
] as const;

export function UniverseMap() {
  const { t } = useLanguage();
  const { isSignedIn } = useUser();
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  const featured = modules[0];
  const rest = modules.slice(1);

  return (
    <section id="universe-map" className="relative">
      <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-24">

        {/* Section header */}
        <div className="hp-marker mb-8 hp-reveal">
          <span className="hp-marker-rule" />
          <span className="hp-marker-section">§ 03</span>
          <span className="hp-marker-label">— The Universe</span>
          <span className="hp-marker-tail" />
        </div>

        <div className="grid gap-8 md:grid-cols-[1.15fr_1fr] md:items-end mb-10">
          <div className="hp-reveal hp-reveal-1">
            <h2 className="hp-h2">{t("home.universe.title")}</h2>
          </div>
          <p className="hp-standfirst max-w-[54ch] hp-reveal hp-reveal-2">
            {t("home.universe.subtitle")}
          </p>
        </div>

        {/* Featured registry card + module grid */}
        <div className="hp-hairline-grid hp-universe-grid">
        <style>{`
          .hp-universe-grid { grid-template-columns: 1fr; }
          @media (min-width: 768px) { .hp-universe-grid { grid-template-columns: 1fr 1fr; } }
          @media (min-width: 1024px) { .hp-universe-grid { grid-template-columns: 1.45fr 1fr 1fr; } }
        `}</style>

          {/* Featured (spans 2 rows on lg) */}
          <Link
            href="/chat"
            className="lg:row-span-3 group relative flex flex-col overflow-hidden hp-reveal hp-reveal-1"
            style={{ background: "linear-gradient(180deg, #071a0e 0%, #0d2a1a 50%, #0a1c10 100%)", padding: 0 }}
          >
            <div className="relative px-7 pt-7 pb-6">
              {/* SVG scales */}
              <svg aria-hidden viewBox="0 0 280 140" className="absolute right-4 bottom-0 w-56 opacity-[0.07]" fill="none">
                <circle cx="140" cy="20" r="4" stroke="#9ddbb8" strokeWidth="1.5" />
                <line x1="140" y1="24" x2="140" y2="80" stroke="#9ddbb8" strokeWidth="1.5" />
                <line x1="80" y1="80" x2="200" y2="80" stroke="#9ddbb8" strokeWidth="1.5" />
                <line x1="80" y1="80" x2="80" y2="130" stroke="#9ddbb8" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="200" y1="80" x2="200" y2="130" stroke="#9ddbb8" strokeWidth="1" strokeDasharray="3,3" />
                <ellipse cx="80" cy="133" rx="22" ry="6" stroke="#9ddbb8" strokeWidth="1" />
                <ellipse cx="200" cy="133" rx="22" ry="6" stroke="#9ddbb8" strokeWidth="1" />
              </svg>

              <div className="flex items-center justify-between mb-5">
                <span style={{
                  fontFamily: "var(--hp-mono)", fontSize: 10, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: "#9ddbb8", fontWeight: 600
                }}>
                  {featured.n}
                </span>
                <span style={{
                  fontFamily: "var(--hp-mono)", fontSize: 9.5, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "rgba(240,232,216,0.55)"
                }}>
                  {t(featured.badgeKey)}
                </span>
              </div>

              <div className="flex size-11 items-center justify-center border mb-4" style={{
                borderColor: "rgba(157,219,184,0.28)",
                background: "rgba(157,219,184,0.10)"
              }}>
                <Search style={{ width: 20, height: 20, color: "#9ddbb8" }} />
              </div>

              <h3 style={{
                fontFamily: "var(--hp-display)", fontWeight: 400,
                fontSize: "1.7rem", lineHeight: 1.15, color: "#f0e8d8",
                letterSpacing: "-0.02em",
                fontVariationSettings: '"opsz" 40'
              }}>
                {t(featured.titleKey)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(240,232,216,0.62)", maxWidth: "44ch" }}>
                {t(featured.descKey)}
              </p>
            </div>

            {/* Sample query preview */}
            <div className="flex-1 px-7 pb-7">
              <div className="border p-4" style={{ borderColor: "rgba(240,232,216,0.10)", background: "rgba(0,0,0,0.25)" }}>
                <p className="mb-3" style={{
                  fontFamily: "var(--hp-mono)", fontSize: 9.5, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: "rgba(240,232,216,0.4)"
                }}>
                  Sample Query
                </p>
                <div className="space-y-2.5">
                  <div className="px-3 py-2.5 border" style={{ borderColor: "rgba(240,232,216,0.08)", background: "rgba(240,232,216,0.03)" }}>
                    <p className="text-xs" style={{ color: "rgba(240,232,216,0.7)" }}>
                      How many days of maternity leave is an employee entitled to?
                    </p>
                  </div>
                  <div className="px-3 py-2.5 border" style={{ borderColor: "rgba(157,219,184,0.18)", background: "rgba(157,219,184,0.05)" }}>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(240,232,216,0.85)" }}>
                      Under Section 46 of the Labour Act 2006, a female worker is entitled to <strong style={{ color: "#9ddbb8" }}>8 weeks</strong> of maternity leave — 4 weeks before and 4 weeks after delivery.
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 border" style={{
                      borderColor: "rgba(178,92,34,0.28)", background: "rgba(178,92,34,0.12)",
                      fontFamily: "var(--hp-mono)", fontSize: 9.5, letterSpacing: "0.08em",
                      color: "#f0a878"
                    }}>
                      <span style={{ fontFamily: "var(--hp-display)", fontStyle: "italic" }}>§ 46</span>
                      BLA 2006
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 inline-flex items-center gap-2" style={{
                fontFamily: "var(--hp-mono)", fontSize: 10.5, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "#9ddbb8", fontWeight: 600,
                borderBottom: "1px solid rgba(157,219,184,0.3)", paddingBottom: 2
              }}>
                {t(featured.ctaKey)}
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>

              {/* Popular questions — secondary prompts */}
              <div className="mt-7">
                <p className="mb-3" style={{
                  fontFamily: "var(--hp-mono)", fontSize: 9.5, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: "rgba(240,232,216,0.4)"
                }}>
                  Try Asking
                </p>
                <ul className="space-y-1.5">
                  {[
                    "Overtime pay calculation under BLA §108",
                    "Termination notice period by service length",
                    "Provident fund and gratuity entitlements",
                    "Festival bonus rules for factory workers",
                  ].map((q) => (
                    <li key={q} className="flex items-start gap-2 text-xs leading-snug" style={{ color: "rgba(240,232,216,0.62)" }}>
                      <span style={{
                        fontFamily: "var(--hp-mono)", fontSize: 9,
                        color: "rgba(211,128,68,0.65)", marginTop: 2, letterSpacing: "0.1em"
                      }}>
                        ↳
                      </span>
                      <span className="transition-colors group-hover:text-[rgba(240,232,216,0.85)]">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust row — citation guarantees */}
              <div className="mt-7 pt-5 grid grid-cols-3 gap-3" style={{
                borderTop: "1px dashed rgba(240,232,216,0.12)"
              }}>
                {[
                  { icon: ShieldCheck, label: "Auditable", sub: "Every claim cited" },
                  { icon: Hash, label: "Section-exact", sub: "§ & clause level" },
                  { icon: Languages, label: "Multilingual", sub: "Eng, Bng, and more.." },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <Icon className="size-3.5" style={{ color: "rgba(157,219,184,0.7)" }} />
                    <span style={{
                      fontFamily: "var(--hp-mono)", fontSize: 9.5, letterSpacing: "0.18em",
                      textTransform: "uppercase", color: "rgba(240,232,216,0.72)", fontWeight: 600
                    }}>
                      {label}
                    </span>
                    <span className="text-[10.5px] leading-tight" style={{ color: "rgba(240,232,216,0.42)" }}>
                      {sub}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Other modules */}
          {rest.map(({ key, n, icon: Icon, badgeKey, titleKey, descKey, ctaKey, href }, i) => (
            <Link
              key={key}
              href={href}
              className={`hp-cell--hover hp-reveal hp-reveal-${Math.min(i + 2, 6)} group`}
            >
              <div className="hp-folio">
                <div className="hp-folio-head">
                  <span className="hp-folio-num">{n}</span>
                  <span className="hp-folio-badge">{t(badgeKey)}</span>
                </div>
                <div className="hp-folio-icon">
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="hp-folio-title">{t(titleKey)}</h3>
                <p className="hp-folio-sub">{t(descKey)}</p>
                <div className="hp-folio-foot">
                  <span className="hp-folio-cta">
                    {t(ctaKey)}
                    <ArrowUpRight className="size-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* Coming soon — more features placeholder */}
          <div
            className="hp-reveal hp-reveal-6"
            style={{
              position: "relative",
              padding: "26px 24px",
              background: "var(--hp-paper-soft)",
              border: "1px dashed var(--hp-rule-strong)",
              minHeight: 260,
              display: "flex",
              flexDirection: "column",
              opacity: 0.82,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="hp-folio-num" style={{ color: "var(--hp-ink-faint)" }}>N° 07</span>
              <span style={{
                fontFamily: "var(--hp-mono)", fontSize: 9.5, letterSpacing: "0.22em",
                textTransform: "uppercase", color: "var(--hp-ink-faint)",
                padding: "2px 6px",
                border: "1px dashed var(--hp-rule-strong)"
              }}>
                Drafting
              </span>
            </div>

            <div className="flex size-10 items-center justify-center border mb-4" style={{
              borderStyle: "dashed",
              borderColor: "var(--hp-rule-strong)",
              background: "transparent"
            }}>
              <Compass style={{ width: 18, height: 18, color: "var(--hp-ink-faint)" }} />
            </div>

            <h3 className="hp-folio-title" style={{ color: "var(--hp-ink-muted)" }}>
              More Modules Inbound
            </h3>
            <p className="hp-folio-sub" style={{ color: "var(--hp-ink-faint)" }}>
              Resource Centre, HR Tools, Case Tracker — shipping through 2026.
            </p>

            <div className="mt-auto pt-5 flex items-center gap-2" style={{
              fontFamily: "var(--hp-mono)", fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--hp-ink-faint)",
              borderTop: "1px dashed var(--hp-rule)"
            }}>
              <span className="inline-block" style={{
                width: 5, height: 5,
                transform: "rotate(45deg)",
                background: "var(--hp-rust)",
                opacity: 0.55,
                marginTop: 16
              }} />
              <span style={{ marginTop: 12 }}>Roadmap · Q2 — Q4 2026</span>
            </div>
          </div>
        </div>

        {/* Early access */}
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => setEarlyAccessOpen(true)}
            className="inline-flex items-center gap-2 hp-micro hover:text-[color:var(--hp-ink)] transition-colors"
          >
            <Sparkles className="size-3" style={{ color: "var(--hp-green)" }} />
            Launching May 1, 2026 · Get early access
          </button>
        </div>
      </div>

      {/* Early Access Dialog — unchanged logic, refined visuals */}
      <Dialog open={earlyAccessOpen} onOpenChange={setEarlyAccessOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0">
          <div className="relative px-6 pt-8 pb-6 text-white" style={{
            background: "linear-gradient(135deg, #071a0e 0%, #0f2d1e 50%, #0d2a1a 100%)"
          }}>
            <div className="relative space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center border" style={{
                  background: "rgba(157,219,184,0.10)", borderColor: "rgba(157,219,184,0.28)"
                }}>
                  <Sparkles className="size-4" style={{ color: "#9ddbb8" }} />
                </div>
                <span style={{
                  fontFamily: "var(--hp-mono)", fontSize: 10, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: "rgba(240,232,216,0.7)"
                }}>
                  Coming May 1, 2026
                </span>
              </div>
              <DialogTitle style={{
                fontFamily: "var(--hp-display)", fontWeight: 400, fontSize: "1.8rem",
                color: "#f0e8d8", letterSpacing: "-0.02em", lineHeight: 1.15
              }}>
                AI Employment Law Search
              </DialogTitle>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: "rgba(240,232,216,0.65)" }}>
                Ask questions across 1,206 sections of Bangladesh labour law and get AI-verified citations with exact section references.
              </p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4" style={{ background: "var(--hp-paper-soft)" }}>
            <div className="flex flex-wrap gap-2">
              {["Maternity Leave", "Overtime Calculation", "Termination Rights", "Gratuity"].map(tag => (
                <span key={tag} className="hp-chip hp-chip--green">{tag}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-0 border border-[var(--hp-rule-strong)]" style={{ background: "var(--hp-rule-strong)", gap: "1px" }}>
              {[
                { value: "1,206", label: "Legal Sections" },
                { value: "8", label: "Instruments" },
                { value: "EN/BN", label: "Bilingual" },
              ].map(stat => (
                <div key={stat.label} className="p-3 text-center" style={{ background: "var(--hp-paper-soft)" }}>
                  <div style={{
                    fontFamily: "var(--hp-display)", fontWeight: 400, fontSize: "1.3rem",
                    color: "var(--hp-green)", letterSpacing: "-0.02em"
                  }}>
                    {stat.value}
                  </div>
                  <div className="hp-micro" style={{ fontSize: 9 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="pt-1">
              {isSignedIn ? (
                <div className="flex items-center gap-3 border p-3" style={{
                  borderColor: "var(--hp-rule-strong)", background: "var(--hp-green-soft)"
                }}>
                  <div className="flex size-8 items-center justify-center" style={{
                    background: "color-mix(in oklab, var(--hp-green) 18%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--hp-green) 32%, transparent)"
                  }}>
                    <Check className="size-4" style={{ color: "var(--hp-green)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--hp-ink)" }}>You&apos;re on the list</p>
                    <p className="hp-micro" style={{ fontSize: 9.5 }}>We&apos;ll notify you when it&apos;s live</p>
                  </div>
                </div>
              ) : (
                <Button asChild className="w-full h-11 rounded-none font-semibold text-sm hp-btn hp-btn--primary">
                  <Link href="/sign-up">
                    Get Early Access
                    <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
