"use client";

import { LockableLink } from "@/components/ui/lockable-link";
import { HardHat, Users, Building2, Scale, Target, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const roles = [
  {
    key: "worker", ch: "CH. I", icon: HardHat,
    titleKey: "home.roles.worker.title", taglineKey: "home.roles.worker.tagline",
    links: [
      { labelKey: "home.roles.worker.link1", href: "/sign-in" },
      { labelKey: "home.roles.worker.link2", href: "/documents" },
    ],
    primaryHref: "/sign-in",
  },
  {
    key: "hr", ch: "CH. II", icon: Users,
    titleKey: "home.roles.hr.title", taglineKey: "home.roles.hr.tagline",
    links: [
      { labelKey: "home.roles.hr.link1", href: "/sign-in" },
      { labelKey: "home.roles.hr.link2", href: "/academy" },
      { labelKey: "home.roles.hr.link3", href: "/services" },
    ],
    primaryHref: "/sign-in",
  },
  {
    key: "employer", ch: "CH. III", icon: Building2,
    titleKey: "home.roles.employer.title", taglineKey: "home.roles.employer.tagline",
    links: [
      { labelKey: "home.roles.employer.link1", href: "/services" },
      { labelKey: "home.roles.employer.link2", href: "/headhunting" },
      { labelKey: "home.roles.employer.link3", href: "/experts" },
    ],
    primaryHref: "/services",
  },
  {
    key: "expert", ch: "CH. IV", icon: Scale,
    titleKey: "home.roles.expert.title", taglineKey: "home.roles.expert.tagline",
    links: [{ labelKey: "home.roles.expert.link1", href: "/experts" }],
    primaryHref: "/experts",
  },
  {
    key: "scout", ch: "CH. V", icon: Target,
    titleKey: "home.roles.scout.title", taglineKey: "home.roles.scout.tagline",
    links: [{ labelKey: "home.roles.scout.link1", href: "/headhunting/scout/join" }],
    primaryHref: "/headhunting/scout/join",
  },
] as const;

export function RoleRouter() {
  const { t } = useLanguage();

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-24">
        {/* Marker */}
        <div className="hp-marker mb-8 hp-reveal">
          <span className="hp-marker-rule" />
          <span className="hp-marker-section">§ 04</span>
          <span className="hp-marker-label">— Entrances</span>
          <span className="hp-marker-tail" />
        </div>

        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end mb-10">
          <div className="hp-reveal hp-reveal-1">
            <h2 className="hp-h2">
              {t("home.roles.title")}
            </h2>
          </div>
          <p className="hp-standfirst max-w-[54ch] hp-reveal hp-reveal-2">
            {t("home.roles.subtitle")}
          </p>
        </div>

        {/* Hairline grid — 5 entrances */}
        <div className="hp-hairline-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {roles.map(({ key, ch, icon: Icon, titleKey, taglineKey, links, primaryHref }, i) => (
            <LockableLink
              key={key}
              href={primaryHref}
              className={`hp-cell--hover hp-reveal hp-reveal-${(i % 6) + 1} group relative`}
              style={{ padding: "22px", textDecoration: "none" }}
            >
              <span aria-hidden className="pointer-events-none absolute top-2 right-4 select-none" style={{
                fontFamily: "var(--hp-display)",
                fontStyle: "italic",
                fontSize: "4.5rem",
                lineHeight: 1,
                color: "color-mix(in oklab, var(--hp-rust) 10%, transparent)",
                fontVariationSettings: '"opsz" 144, "SOFT" 100'
              }}>
                {ch.replace("CH. ", "")}
              </span>
              <div className="hp-folio relative">
                <div className="hp-folio-icon">
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="hp-folio-title">{t(titleKey)}</h3>
                <p className="hp-folio-sub">{t(taglineKey)}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {links.map(({ labelKey }) => (
                    <span key={labelKey} className="hp-chip">
                      {t(labelKey)}
                    </span>
                  ))}
                </div>
                <div className="hp-folio-foot">
                  <span className="hp-folio-cta">
                    Enter
                    <ArrowUpRight className="size-3" />
                  </span>
                </div>
              </div>
            </LockableLink>
          ))}
        </div>
      </div>
    </section>
  );
}
