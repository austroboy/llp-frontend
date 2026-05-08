"use client";

import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface Tier {
  n: string;
  nameKey: string;
  priceKey: string;
  featuresKeys: string[];
  highlighted: boolean;
  ctaKey: string;
  href: string;
  comingSoon: boolean;
}

const tiers: Tier[] = [
  {
    n: "N° i",
    nameKey: "home.pricing.free",
    priceKey: "home.pricing.freePrice",
    featuresKeys: ["home.pricing.free.f1", "home.pricing.free.f2", "home.pricing.free.f3"],
    highlighted: true,
    ctaKey: "home.pricing.getStarted",
    href: "/sign-up",
    comingSoon: false,
  },
  {
    n: "N° ii",
    nameKey: "home.pricing.mini",
    priceKey: "home.pricing.comingSoon",
    featuresKeys: ["home.pricing.mini.f1", "home.pricing.mini.f2", "home.pricing.mini.f3", "home.pricing.mini.f4"],
    highlighted: false,
    ctaKey: "home.pricing.comingSoon",
    href: "#",
    comingSoon: true,
  },
  {
    n: "N° iii",
    nameKey: "home.pricing.max",
    priceKey: "home.pricing.comingSoon",
    featuresKeys: ["home.pricing.max.f1", "home.pricing.max.f2", "home.pricing.max.f3", "home.pricing.max.f4"],
    highlighted: false,
    ctaKey: "home.pricing.comingSoon",
    href: "#",
    comingSoon: true,
  },
  {
    n: "N° iv",
    nameKey: "home.pricing.team",
    priceKey: "home.pricing.comingSoon",
    featuresKeys: ["home.pricing.team.f1", "home.pricing.team.f2", "home.pricing.team.f3", "home.pricing.team.f4"],
    highlighted: false,
    ctaKey: "home.pricing.comingSoon",
    href: "#",
    comingSoon: true,
  },
];

export function PricingPreview() {
  const { t } = useLanguage();

  return (
    <section id="pricing" className="relative">
      <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-24">
        <div className="hp-marker mb-8 hp-reveal">
          <span className="hp-marker-rule" />
          <span className="hp-marker-section">§ 08</span>
          <span className="hp-marker-label">— The Registry</span>
          <span className="hp-marker-tail" />
        </div>

        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end mb-10">
          <div className="hp-reveal hp-reveal-1">
            <h2 className="hp-h2">{t("home.pricing.title")}</h2>
          </div>
          <p className="hp-standfirst max-w-[54ch] hp-reveal hp-reveal-2">
            {t("home.pricing.subtitle")}
          </p>
        </div>

        <div className="hp-hairline-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {tiers.map((tier, i) => (
            <div
              key={tier.nameKey}
              className={`hp-reveal hp-reveal-${i + 1} relative flex flex-col`}
              style={{ padding: "26px 24px" }}
            >
              {tier.highlighted && (
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "var(--hp-green)" }} />
              )}

              <div className="flex items-start justify-between mb-4">
                <span className="hp-folio-num">{tier.n}</span>
                {tier.highlighted ? (
                  <span className="hp-chip hp-chip--green" style={{ fontSize: 9, padding: "3px 8px" }}>
                    Available Now
                  </span>
                ) : (
                  <span className="hp-chip" style={{ fontSize: 9, padding: "3px 8px" }}>
                    <Sparkles className="size-2.5" />
                    Soon
                  </span>
                )}
              </div>

              <h3 className="hp-folio-title mb-2" style={{ fontSize: "1.05rem" }}>{t(tier.nameKey)}</h3>

              <div className="mb-5">
                {tier.comingSoon ? (
                  <span className="hp-italic-accent" style={{ fontSize: "1.05rem", color: "var(--hp-ink-faint)" }}>
                    Coming soon
                  </span>
                ) : (
                  <span className="hp-stat-num" style={{ fontSize: "2.8rem" }}>
                    {t(tier.priceKey)}
                  </span>
                )}
              </div>

              <ul className="flex-1 space-y-2.5 mb-6">
                {tier.featuresKeys.map((fk) => (
                  <li key={fk} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--hp-ink-muted)" }}>
                    <span
                      style={{
                        width: 12, height: 1, marginTop: 10, flexShrink: 0,
                        background: tier.highlighted ? "var(--hp-green)" : "var(--hp-rule-strong)"
                      }}
                    />
                    <span>{t(fk)}</span>
                  </li>
                ))}
              </ul>

              {tier.comingSoon ? (
                <button
                  disabled
                  className="hp-btn hp-btn--ghost w-full justify-center opacity-60 cursor-not-allowed"
                >
                  {t("home.pricing.comingSoon")}
                </button>
              ) : (
                <Link href={tier.href} className="hp-btn hp-btn--primary w-full justify-center group">
                  <span>{t(tier.ctaKey)}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
