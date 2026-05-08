"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { api } from "@convex/_generated/api";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { useLanguage } from "@/hooks/use-language";
import { ServiceRequestDialog } from "@/components/services/service-request-dialog";
import "@/components/landing/landing.css";
import "./services-styles.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

const inViewOnce = { once: true, margin: "-72px 0px" } as const;

/* ──────────────────────────────────────────────────────────────────── */
/*  Category config                                                     */
/* ──────────────────────────────────────────────────────────────────── */

const categoryConfig = {
  expatriate: {
    roman: "I",
    kickerKey: "services.expatriate.kicker",
    titleKey: "services.expatriate.title",
    subtitleKey: "services.expatriate.subtitle",
    deskLabel: "Desk of Expatriate Affairs",
    tone: "rust" as const,
  },
  hr: {
    roman: "II",
    kickerKey: "services.hr.kicker",
    titleKey: "services.hr.title",
    subtitleKey: "services.hr.subtitle",
    deskLabel: "Desk of HR & People",
    tone: "green" as const,
  },
  licensing: {
    roman: "III",
    kickerKey: "services.licensing.kicker",
    titleKey: "services.licensing.title",
    subtitleKey: "services.licensing.subtitle",
    deskLabel: "Desk of Licensing & Regulatory",
    tone: "ink" as const,
  },
} as const;

type CategoryKey = keyof typeof categoryConfig;
const CATEGORY_KEYS: readonly CategoryKey[] = [
  "expatriate",
  "hr",
  "licensing",
] as const;

const ROMAN_INDEX = ["I", "II", "III", "IV"] as const;

/* Operating standards (4 items, copy via i18n) */
const STANDARDS = [
  { idx: 0, titleKey: "services.standard.s1.title", descKey: "services.standard.s1.desc" },
  { idx: 1, titleKey: "services.standard.s2.title", descKey: "services.standard.s2.desc" },
  { idx: 2, titleKey: "services.standard.s3.title", descKey: "services.standard.s3.desc" },
  { idx: 3, titleKey: "services.standard.s4.title", descKey: "services.standard.s4.desc" },
] as const;

/* Insight strip — 3 items (engagement velocity / operational standard / record retention) */
type Insight = {
  label: string;
  stat: string;
  unit: string;
  desc: React.ReactNode;
};

const INSIGHTS: Insight[] = [
  {
    label: "Engagement velocity",
    stat: "22",
    unit: "services in catalog",
    desc: (
      <>
        Covering expatriate visa work, HR and people solutions, licensing and
        regulatory filings.{" "}
        <strong>PF and gratuity services added Q2 2026.</strong>
      </>
    ),
  },
  {
    label: "Operational standard",
    stat: "1",
    unit: "business day to scope",
    desc: (
      <>
        From intake to written scope and fixed-fee quote.{" "}
        <strong>Single named lead</strong> confirmed before work begins.
      </>
    ),
  },
  {
    label: "Record retention",
    stat: "7",
    unit: "years archived",
    desc: (
      <>
        Filings, correspondence, inspections, and meetings timestamped and
        retrievable for <strong>seven years after closure</strong>.
      </>
    ),
  },
];

/* ──────────────────────────────────────────────────────────────────── */
/*  Main component                                                      */
/* ──────────────────────────────────────────────────────────────────── */

export function ServicesContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();

  // Avoid hydration flash — only commit theme attribute after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "light";

  // Dialog state — preserved verbatim from original.
  const [dialog, setDialog] = useState<{
    open: boolean;
    service: any;
  }>({ open: false, service: null });

  // Convex query — preserved verbatim.
  const services = useQuery(api.serviceProducts.getActive, {});

  // ?service= deep-link auto-open — preserved.
  const autoOpenHandled = useRef(false);
  useEffect(() => {
    if (autoOpenHandled.current) return;
    const requestCategory = searchParams.get("request") ?? searchParams.get("service");
    if (!requestCategory || !services?.length) return;

    const matchingService =
      services.find((s) => s._id === (requestCategory as any)) ||
      services.find((s) => s.category === requestCategory);
    if (matchingService) {
      autoOpenHandled.current = true;
      const timer = setTimeout(() => {
        setDialog({ open: true, service: matchingService });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, services]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hash scroll behaviour — preserved.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    const timer = setTimeout(() => {
      const target = document.querySelector(hash);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="lf-page" data-theme={themeAttr}>
      <SiteTopNav />

      <main>
        <section className="lf-services-wrap">
          {/* -- Hero -------------------------------------------- */}
          <motion.header
            className="lf-services-hero"
            variants={heroStagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp} className="lf-kicker">
              <span className="lf-kicker-mark">§ III</span>
              {t("services.hero.kicker")}
            </motion.div>
            <motion.h1 variants={fadeUp} className="lf-services-title">
              {t("services.hero.titleLead")}{" "}
              <em>{t("services.hero.titleAccent")}</em>
            </motion.h1>
            <motion.p variants={fadeUp} className="lf-services-deck">
              {t("services.hero.deck")}
            </motion.p>

            <motion.div variants={fadeUp} style={{ marginTop: "var(--s-4)" }}>
              <a
                href="mailto:support@laborlawpartner.com?subject=LLP%20Services%20Desk%20enquiry"
                className="lf-services-cross-link"
              >
                {t("services.hero.ctaSecondary")} →
              </a>
            </motion.div>
          </motion.header>

          {/* -- 4 operating standards --------------------------- */}
          <motion.div
            className="lf-services-standards"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            {STANDARDS.map(({ idx, titleKey, descKey }) => (
              <motion.div className="lf-standard" key={idx} variants={fadeUp}>
                <div className="lf-standard-label">
                  Standard {ROMAN_INDEX[idx]}
                </div>
                <h3 className="lf-standard-title">{t(titleKey)}</h3>
                <p className="lf-standard-desc">{t(descKey)}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* -- Insight strip (reuses landing.css `.lf-insight-*`) -- */}
          <div className="lf-services-insights">
            <motion.div
              className="lf-insight-strip"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {INSIGHTS.map((insight) => (
                <motion.div className="lf-insight-item" key={insight.label} variants={fadeUp}>
                  <span className="lf-insight-label">{insight.label}</span>
                  <h3 className="lf-insight-stat">
                    {insight.stat}
                    <span className="lf-unit">{insight.unit}</span>
                  </h3>
                  <p className="lf-insight-desc">{insight.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* -- 3 categories ----------------------------------- */}
          {CATEGORY_KEYS.map((catKey, catIdx) => {
            const cfg = categoryConfig[catKey];
            const items = (services ?? []).filter(
              (s) => s.category === catKey
            );
            const deskShort = cfg.deskLabel.replace(/^Desk of\s+/, "");

            return (
              <section
                id={catKey}
                className="lf-services-category scroll-mt-20"
                key={catKey}
              >
                <motion.div
                  className="lf-services-category-header"
                  variants={stagger}
                  initial="hidden"
                  whileInView="show"
                  viewport={inViewOnce}
                >
                  <div className="lf-services-category-left">
                    <motion.div
                      variants={fadeUp}
                      className="lf-services-category-kicker"
                    >
                      <span className="lf-services-category-kicker-mark">
                        § III.{catIdx + 1}
                      </span>
                      {t(cfg.kickerKey)}
                    </motion.div>
                    <motion.h2
                      variants={fadeUp}
                      className="lf-services-category-title"
                    >
                      {t(cfg.titleKey)}
                      <span style={{ color: "var(--ink-3)" }}>.</span>
                    </motion.h2>
                    <motion.p
                      variants={fadeUp}
                      className="lf-services-category-desc"
                    >
                      {t(cfg.subtitleKey)}
                    </motion.p>
                  </div>
                  <motion.span
                    variants={fadeUp}
                    className="lf-services-category-anchor"
                  >
                    See all · {items.length}{" "}
                    {items.length === 1 ? "service" : "services"}
                  </motion.span>
                </motion.div>

                {services === undefined ? (
                  <div className="lf-services-grid-loading">Loading…</div>
                ) : items.length === 0 ? (
                  <div className="lf-services-grid-empty">
                    No services currently registered at this desk.
                  </div>
                ) : (
                  <div className="lf-services-grid">
                    {items.map((svc, i) => {
                      const title =
                        language === "bn" && svc.titleBn
                          ? svc.titleBn
                          : svc.title;
                      const desc =
                        language === "bn" && svc.descriptionBn
                          ? svc.descriptionBn
                          : svc.description;
                      const ref = `§ III.${catIdx + 1}.${String(
                        i + 1
                      ).padStart(2, "0")}`;

                      return (
                        <motion.button
                          type="button"
                          className="lf-service-card"
                          key={svc._id}
                          onClick={() =>
                            setDialog({ open: true, service: svc })
                          }
                          initial={{ opacity: 0, y: 14 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={inViewOnce}
                          transition={{
                            duration: 0.5,
                            delay: i * 0.045,
                            ease: EASE_OUT,
                          }}
                        >
                          <div className="lf-service-card-ref">{ref}</div>
                          <h3 className="lf-service-card-title">{title}</h3>
                          <p className="lf-service-card-desc">{desc}</p>

                          <div className="lf-service-card-meta">
                            <div className="lf-service-card-meta-item">
                              <span className="lf-service-card-meta-label">
                                Fee
                              </span>
                              <span className="lf-service-card-meta-value lf-service-card-meta-value--small">
                                {svc.price ?? "—"}
                              </span>
                            </div>
                            <div className="lf-service-card-meta-item">
                              <span className="lf-service-card-meta-label">
                                Lead
                              </span>
                              <span className="lf-service-card-meta-value">
                                {deskShort}
                              </span>
                            </div>
                            <div className="lf-service-card-meta-item">
                              <span className="lf-service-card-meta-label">
                                Typical duration
                              </span>
                              <span className="lf-service-card-meta-value">
                                {svc.deliveryTimeline ?? "Scoped per job"}
                              </span>
                            </div>
                            <div className="lf-service-card-meta-item">
                              <span className="lf-service-card-meta-label">
                                Status
                              </span>
                              <span className="lf-service-card-meta-value">
                                {svc.badge ?? "Active"}
                              </span>
                            </div>
                          </div>

                          <div className="lf-service-card-foot">
                            <span className="lf-service-card-foot-kind">
                              {svc.workflow ?? "Procedural support"}
                            </span>
                            <span className="lf-service-card-foot-scope">
                              Scope it
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          {/* -- Cross-sell (Audit + Headhunting) --------------- */}
          <motion.div
            className="lf-services-cross"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            <motion.div className="lf-services-cross-card" variants={fadeUp}>
              <div className="lf-services-cross-kicker">§ Audit</div>
              <h3 className="lf-services-cross-title">
                {t("services.cross.audit.title")}
              </h3>
              <p className="lf-services-cross-desc">
                {t("services.cross.audit.desc")}
              </p>
              <Link href="/audit" className="lf-services-cross-link">
                Run an audit →
              </Link>
            </motion.div>
            <motion.div className="lf-services-cross-card" variants={fadeUp}>
              <div className="lf-services-cross-kicker">§ Headhunting</div>
              <h3 className="lf-services-cross-title">
                {t("services.cross.headhunt.title")}
              </h3>
              <p className="lf-services-cross-desc">
                {t("services.cross.headhunt.desc")}
              </p>
              <Link href="/headhunting" className="lf-services-cross-link">
                Visit Headhunting →
              </Link>
            </motion.div>
          </motion.div>

          {/* -- Stamp footer ----------------------------------- */}
          <motion.div
            className="lf-services-stamp"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={inViewOnce}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <span>Services Desk · 22+ statutory services</span>
            <span>v2026.04.26</span>
          </motion.div>
        </section>
      </main>

      <HomepageFooter />

      <ServiceRequestDialog
        open={dialog.open}
        onOpenChange={(open) =>
          setDialog((prev) => ({ ...prev, open, service: open ? prev.service : null }))
        }
        service={dialog.service}
      />
    </div>
    </MotionConfig>
  );
}
