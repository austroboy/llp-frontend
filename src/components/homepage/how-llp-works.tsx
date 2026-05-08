"use client";

import { Search, UserCheck, FileText, ClipboardCheck } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const steps = [
  { roman: "I",   icon: Search,         titleKey: "home.how.step1.title", descKey: "home.how.step1.desc" },
  { roman: "II",  icon: UserCheck,      titleKey: "home.how.step2.title", descKey: "home.how.step2.desc" },
  { roman: "III", icon: FileText,       titleKey: "home.how.step3.title", descKey: "home.how.step3.desc" },
  { roman: "IV",  icon: ClipboardCheck, titleKey: "home.how.step4.title", descKey: "home.how.step4.desc" },
] as const;

export function HowLLPWorks() {
  const { t } = useLanguage();

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-24">
        {/* Marker */}
        <div className="hp-marker mb-8 hp-reveal">
          <span className="hp-marker-rule" />
          <span className="hp-marker-section">§ 05</span>
          <span className="hp-marker-label">— The Method</span>
          <span className="hp-marker-tail" />
        </div>

        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end mb-10">
          <div className="hp-reveal hp-reveal-1">
            <h2 className="hp-h2">{t("home.how.title")}</h2>
          </div>
          <p className="hp-standfirst max-w-[54ch] hp-reveal hp-reveal-2">
            {t("home.how.subtitle")}
          </p>
        </div>

        <div className="hp-hairline-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ roman, icon: Icon, titleKey, descKey }, i) => (
            <div key={roman} className={`hp-reveal hp-reveal-${i + 1} relative`} style={{ padding: "26px 24px 22px" }}>
              {/* Watermark roman numeral */}
              <span aria-hidden className="pointer-events-none absolute top-2 right-4 select-none" style={{
                fontFamily: "var(--hp-display)",
                fontStyle: "italic",
                fontSize: "4.5rem",
                lineHeight: 1,
                color: "color-mix(in oklab, var(--hp-rust) 10%, transparent)",
                fontVariationSettings: '"opsz" 144, "SOFT" 100'
              }}>
                {roman}
              </span>

              <div className="relative">
                <div className="hp-folio-icon hp-folio-icon--rust mb-4">
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="hp-folio-title mb-2">{t(titleKey)}</h3>
                <p className="hp-folio-sub">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
