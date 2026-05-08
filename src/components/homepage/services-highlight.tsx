"use client";

import { LockableLink } from "@/components/ui/lockable-link";
import { ArrowRight, ArrowUpRight, Headset, Shield, Users, Globe, Scale, Wallet, GraduationCap } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const stages = [
  "home.servicesHl.stage1",
  "home.servicesHl.stage2",
  "home.servicesHl.stage3",
  "home.servicesHl.stage4",
  "home.servicesHl.stage5",
] as const;

const categories = [
  { n: "i",    labelKey: "home.servicesHl.cat1", href: "/services#compliance",  icon: Shield,         live: true  },
  { n: "ii",   labelKey: "home.servicesHl.cat2", href: "/services#expatriate",  icon: Globe,          live: true  },
  { n: "iii",  labelKey: "home.servicesHl.cat3", href: "/services#hr",          icon: Users,          live: true  },
  { n: "iv",   labelKey: "home.servicesHl.cat4", href: "/services#licensing",   icon: Scale,          live: true  },
  { n: "v",    labelKey: "home.servicesHl.cat5", href: "/services",             icon: Wallet,         live: false },
  { n: "vi",   labelKey: "home.servicesHl.cat6", href: "/services",             icon: GraduationCap,  live: false },
] as const;

export function ServicesHighlight() {
  const { t } = useLanguage();

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-24">
        <div className="hp-marker mb-8 hp-reveal">
          <span className="hp-marker-rule" />
          <span className="hp-marker-section">§ 06</span>
          <span className="hp-marker-label">— Compliance Atelier</span>
          <span className="hp-marker-tail" />
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          {/* Left — copy */}
          <div className="hp-reveal hp-reveal-1">
            <h2 className="hp-h2 mb-5">
              {t("home.servicesHl.title")}
            </h2>
            <p className="hp-standfirst max-w-[52ch] mb-7">
              {t("home.servicesHl.desc")}
            </p>

            {/* Process stages as running numbered list */}
            <div className="hp-runlist mb-8">
              {stages.map((key, i) => (
                <div key={key} className="hp-runlist-item">
                  <span className="hp-runlist-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="hp-runlist-text">{t(key)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <LockableLink href="/services" className="hp-btn hp-btn--primary group">
                <span>{t("home.servicesHl.cta1")}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </LockableLink>
              <LockableLink href="/track" className="hp-btn hp-btn--ghost">
                <span>{t("home.servicesHl.cta2")}</span>
              </LockableLink>
            </div>
          </div>

          {/* Right — service registry */}
          <div className="hp-reveal hp-reveal-2">
            <div className="hp-panel">
              <div className="hp-panel-head">
                <span className="hp-panel-num">N° 06</span>
                <span className="hp-panel-title">{t("home.servicesHl.cardLabel")}</span>
              </div>
              <div className="hp-panel-body" style={{ padding: 0 }}>
                {categories.map(({ n, labelKey, href, icon: Icon, live }) => (
                  <LockableLink
                    key={labelKey}
                    href={href}
                    className="group flex items-center gap-4 px-6 py-3.5 border-b last:border-b-0"
                    style={{ borderColor: "var(--hp-rule)", textDecoration: "none", color: "inherit", transition: "background 160ms ease" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in oklab, var(--hp-rust) 4%, transparent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      fontFamily: "var(--hp-display)", fontStyle: "italic",
                      fontSize: "0.95rem", color: live ? "var(--hp-rust)" : "var(--hp-ink-faint)", minWidth: 26,
                      fontVariationSettings: '"opsz" 24, "SOFT" 100'
                    }}>
                      {n}.
                    </span>
                    <div className="flex size-9 shrink-0 items-center justify-center border" style={{
                      borderColor: "var(--hp-rule-strong)",
                      borderStyle: live ? "solid" : "dashed",
                      background: "color-mix(in oklab, var(--hp-ink) 3%, transparent)"
                    }}>
                      <Icon style={{
                        width: 14, height: 14,
                        color: live ? "var(--hp-rust)" : "var(--hp-ink-faint)"
                      }} />
                    </div>
                    <span className="flex-1 text-sm" style={{
                      color: live ? "var(--hp-ink)" : "var(--hp-ink-muted)"
                    }}>
                      {t(labelKey)}
                    </span>
                    {live ? (
                      <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: "var(--hp-ink-faint)" }} />
                    ) : (
                      <span style={{
                        fontFamily: "var(--hp-mono)", fontSize: 9, letterSpacing: "0.22em",
                        textTransform: "uppercase", color: "var(--hp-ink-faint)",
                        padding: "2px 6px",
                        border: "1px dashed var(--hp-rule-strong)"
                      }}>
                        Soon
                      </span>
                    )}
                  </LockableLink>
                ))}
              </div>
            </div>

            {/* Expert-backed note */}
            <div className="mt-4 flex items-center gap-3 border px-5 py-3.5" style={{
              borderColor: "var(--hp-rule-strong)",
              background: "color-mix(in oklab, var(--hp-green) 5%, transparent)"
            }}>
              <Headset className="size-4 shrink-0" style={{ color: "var(--hp-green)" }} />
              <p className="text-xs leading-snug" style={{ color: "var(--hp-ink-muted)" }}>
                <strong style={{ color: "var(--hp-ink)" }}>Expert-backed compliance</strong> — every service guided by certified Bangladesh labour law specialists.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
