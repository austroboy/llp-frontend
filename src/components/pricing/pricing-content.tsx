"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Info,
  Minus,
  Sparkles,
} from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { useLanguage } from "@/hooks/use-language";
import "@/components/landing/landing.css";

/* ───────────────── Motion ───────────────── */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const inViewOnce = { once: true, margin: "-72px 0px" } as const;

/* ───────────────── Types + data ───────────────── */

type TierKey = "free" | "mini" | "max" | "team";
type CellValue = boolean | "limited" | { key: string };

interface TierSpec {
  key: TierKey;
  folio: string;
  cadenceKey: string;
  featured: boolean;
  available: boolean;
  ctaHref: string;
  featureKeys: string[];
  footnoteKey?: string;
}

interface MatrixRow {
  labelKey: string;
  hintKey?: string;
  values: Record<TierKey, CellValue>;
}

const TIERS: TierSpec[] = [
  {
    key: "free",
    folio: "N° i",
    cadenceKey: "pricing.cadence.forever",
    featured: true,
    available: true,
    ctaHref: "/sign-up",
    featureKeys: [
      "pricing.tier.free.f1",
      "pricing.tier.free.f2",
      "pricing.tier.free.f3",
      "pricing.tier.free.f4",
    ],
  },
  {
    key: "mini",
    folio: "N° ii",
    cadenceKey: "pricing.cadence.perMonth",
    featured: false,
    available: true,
    ctaHref: "/sign-up?plan=mini",
    featureKeys: [
      "pricing.tier.mini.f1",
      "pricing.tier.mini.f2",
      "pricing.tier.mini.f3",
      "pricing.tier.mini.f4",
      "pricing.tier.mini.f5",
    ],
  },
  {
    key: "max",
    folio: "N° iii",
    cadenceKey: "pricing.cadence.perMonth",
    featured: false,
    available: true,
    ctaHref: "/sign-up?plan=max",
    featureKeys: [
      "pricing.tier.max.f1",
      "pricing.tier.max.f2",
      "pricing.tier.max.f3",
      "pricing.tier.max.f4",
      "pricing.tier.max.f5",
      "pricing.tier.max.f6",
      "pricing.tier.max.f7",
      "pricing.tier.max.f8",
    ],
  },
  {
    key: "team",
    folio: "N° iv",
    cadenceKey: "pricing.cadence.coming2026",
    featured: false,
    available: false,
    ctaHref: "#waitlist",
    featureKeys: [
      "pricing.tier.team.f1",
      "pricing.tier.team.f2",
      "pricing.tier.team.f3",
      "pricing.tier.team.f4",
      "pricing.tier.team.f5",
      "pricing.tier.team.f6",
      "pricing.tier.team.f7",
    ],
  },
];

const MATRIX: MatrixRow[] = [
  { labelKey: "pricing.matrix.row.chats.label", values: { free: { key: "pricing.matrix.row.chats.free" }, mini: { key: "pricing.matrix.row.chats.mini" }, max: { key: "pricing.matrix.row.chats.max" }, team: { key: "pricing.matrix.row.chats.team" } } },
  { labelKey: "pricing.matrix.row.memory.label", hintKey: "pricing.matrix.row.memory.hint", values: { free: { key: "pricing.matrix.row.memory.free" }, mini: { key: "pricing.matrix.row.memory.mini" }, max: { key: "pricing.matrix.row.memory.max" }, team: { key: "pricing.matrix.row.memory.team" } } },
  { labelKey: "pricing.matrix.row.files.label", hintKey: "pricing.matrix.row.files.hint", values: { free: false, mini: false, max: true, team: true } },
  { labelKey: "pricing.matrix.row.advisory.label", hintKey: "pricing.matrix.row.advisory.hint", values: { free: false, mini: false, max: true, team: true } },
  { labelKey: "pricing.matrix.row.citation.label", hintKey: "pricing.matrix.row.citation.hint", values: { free: false, mini: false, max: true, team: true } },
  { labelKey: "pricing.matrix.row.cross.label", hintKey: "pricing.matrix.row.cross.hint", values: { free: false, mini: true, max: true, team: true } },
  { labelKey: "pricing.matrix.row.calc.label", hintKey: "pricing.matrix.row.calc.hint", values: { free: false, mini: true, max: true, team: true } },
  { labelKey: "pricing.matrix.row.filegen.label", hintKey: "pricing.matrix.row.filegen.hint", values: { free: false, mini: false, max: "limited", team: { key: "pricing.matrix.row.filegen.team" } } },
  { labelKey: "pricing.matrix.row.workspace.label", hintKey: "pricing.matrix.row.workspace.hint", values: { free: false, mini: false, max: { key: "pricing.matrix.row.workspace.max" }, team: { key: "pricing.matrix.row.workspace.team" } } },
  { labelKey: "pricing.matrix.row.templates.label", hintKey: "pricing.matrix.row.templates.hint", values: { free: false, mini: false, max: { key: "pricing.matrix.row.templates.max" }, team: { key: "pricing.matrix.row.templates.team" } } },
  { labelKey: "pricing.matrix.row.postQuota.label", values: { free: { key: "pricing.matrix.row.postQuota.free" }, mini: { key: "pricing.matrix.row.postQuota.mini" }, max: { key: "pricing.matrix.row.postQuota.max" }, team: { key: "pricing.matrix.row.postQuota.team" } } },
  { labelKey: "pricing.matrix.row.rate.label", values: { free: { key: "pricing.matrix.row.rate.free" }, mini: { key: "pricing.matrix.row.rate.mini" }, max: { key: "pricing.matrix.row.rate.max" }, team: { key: "pricing.matrix.row.rate.team" } } },
  { labelKey: "pricing.matrix.row.bilingual.label", values: { free: true, mini: true, max: true, team: true } },
  { labelKey: "pricing.matrix.row.priority.label", values: { free: { key: "pricing.matrix.row.priority.free" }, mini: { key: "pricing.matrix.row.priority.mini" }, max: { key: "pricing.matrix.row.priority.max" }, team: { key: "pricing.matrix.row.priority.team" } } },
  { labelKey: "pricing.matrix.row.backup.label", values: { free: { key: "pricing.matrix.row.backup.free" }, mini: { key: "pricing.matrix.row.backup.mini" }, max: { key: "pricing.matrix.row.backup.max" }, team: { key: "pricing.matrix.row.backup.team" } } },
  { labelKey: "pricing.matrix.row.support.label", values: { free: { key: "pricing.matrix.row.support.free" }, mini: { key: "pricing.matrix.row.support.mini" }, max: { key: "pricing.matrix.row.support.max" }, team: { key: "pricing.matrix.row.support.team" } } },
];

const FAQ = [
  { qKey: "pricing.faq.q1.q", aKey: "pricing.faq.q1.a" },
  { qKey: "pricing.faq.q2.q", aKey: "pricing.faq.q2.a" },
  { qKey: "pricing.faq.q3.q", aKey: "pricing.faq.q3.a" },
  { qKey: "pricing.faq.q4.q", aKey: "pricing.faq.q4.a" },
  { qKey: "pricing.faq.q5.q", aKey: "pricing.faq.q5.a" },
  { qKey: "pricing.faq.q6.q", aKey: "pricing.faq.q6.a" },
];

function tierField(key: TierKey, field: string) {
  return `pricing.tier.${key}.${field}` as const;
}

/* ───────────────── Helpers ───────────────── */

function Kicker({ n, labelKey }: { n: string; labelKey: string }) {
  const { t } = useLanguage();
  return (
    <div className="lf-kicker">
      <span className="lf-kicker-mark">§ {n}</span>
      {t(labelKey)}
    </div>
  );
}

function TitleTriple({
  preKey,
  emKey,
  suffixKey,
  variant = "h2",
  className,
}: {
  preKey: string;
  emKey?: string;
  suffixKey?: string;
  variant?: "h1" | "h2";
  className?: string;
}) {
  const { t } = useLanguage();
  const Tag = variant === "h1" ? "h1" : "h2";
  return (
    <Tag className={`lf-h2 ${className ?? ""}`} style={
      variant === "h1"
        ? { fontSize: "clamp(36px, 4.6vw, 56px)" }
        : undefined
    }>
      {t(preKey)}
      {emKey && (
        <>
          {" "}
          <em>{t(emKey)}</em>
        </>
      )}
      {suffixKey && <> {t(suffixKey)}</>}
    </Tag>
  );
}

function MatrixCell({ value }: { value: CellValue }) {
  const { t } = useLanguage();
  if (value === true)
    return (
      <Check
        className="size-4 mx-auto"
        style={{ color: "var(--emerald)" }}
      />
    );
  if (value === false)
    return (
      <Minus
        className="size-4 mx-auto"
        style={{ color: "var(--ink-5)" }}
      />
    );
  if (value === "limited")
    return (
      <span
        style={{
          fontFamily: "var(--lf-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--bronze)",
          fontWeight: 600,
        }}
      >
        Limited
      </span>
    );
  return (
    <span
      style={{
        fontFamily: "var(--lf-body)",
        fontSize: 12.5,
        color: "var(--ink-2)",
      }}
    >
      {t(value.key)}
    </span>
  );
}

/* ───────────────── Sections ───────────────── */

function PricingHero() {
  const { t } = useLanguage();
  return (
    <section className="lf-section">
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <Kicker n="01" labelKey="pricing.hero.marker" />
        </motion.div>
      </motion.div>

      <div className="grid gap-10 md:grid-cols-[1.25fr_1fr] md:items-end">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp}>
            <TitleTriple
              preKey="pricing.hero.title.pre"
              emKey="pricing.hero.title.em"
              variant="h1"
            />
          </motion.div>
          <motion.p
            variants={fadeUp}
            className="lf-section-deck"
            style={{ marginTop: 18, maxWidth: "58ch" }}
          >
            {t("pricing.hero.standfirst")}
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 md:items-end"
        >
          <motion.div variants={fadeUp}>
            <Link href="/sign-up" className="lf-cta lf-cta--primary lf-glow">
              <span>{t("pricing.hero.cta.start")}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Link href="#plans" className="lf-cta lf-cta--ghost lf-glow">
              <span>{t("pricing.hero.cta.comparePlans")}</span>
            </Link>
          </motion.div>
          <motion.span
            variants={fadeUp}
            className="lf-meta"
            style={{ fontSize: 9.5, letterSpacing: "0.2em" }}
          >
            {t("pricing.hero.noCard")}
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}

function PricingTiers() {
  const { t } = useLanguage();
  return (
    <section id="plans" className="lf-section">
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp}>
          <Kicker n="02" labelKey="pricing.tiers.marker" />
        </motion.div>
      </motion.div>

      <motion.div
        className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        {TIERS.map((tier) => {
          const tone = tier.featured ? "accent-blue" : tier.available ? "emerald" : "bronze";
          return (
            <motion.article
              key={tier.key}
              variants={fadeUp}
              className="lf-card lf-card--hover relative flex flex-col"
              style={
                tier.featured
                  ? {
                      borderColor:
                        "color-mix(in oklab, var(--accent-blue) 50%, var(--glass-border))",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.5), 0 18px 48px -16px color-mix(in oklab, var(--accent-blue) 32%, rgba(15,23,42,0.22))",
                    }
                  : undefined
              }
            >
              {tier.featured && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -1,
                    left: 16,
                    right: 16,
                    height: 3,
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, transparent, var(--accent-blue), transparent)",
                  }}
                />
              )}

              <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
                <span className="lf-meta lf-meta--accent">{tier.folio}</span>
                {tier.featured ? (
                  <span className="lf-status lf-status--live">
                    <span className="lf-status-dot" />
                    {t("pricing.tiers.chip.availableNow")}
                  </span>
                ) : tier.available ? (
                  <span className="lf-status">
                    {t("pricing.tiers.chip.available")}
                  </span>
                ) : (
                  <span
                    className="lf-status"
                    style={{ color: "var(--bronze)" }}
                  >
                    <Sparkles className="size-2.5" />
                    {t("pricing.tiers.chip.soon")}
                  </span>
                )}
              </div>

              <h3 className="lf-h3" style={{ fontSize: 20 }}>
                {t(tierField(tier.key, "name"))}
              </h3>
              <p className="lf-body" style={{ marginTop: 6, fontSize: 13.5 }}>
                {t(tierField(tier.key, "summary"))}
              </p>

              <div className="flex items-baseline gap-2" style={{ marginTop: 18, marginBottom: 18 }}>
                {tier.available ? (
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontWeight: 500,
                      fontSize: 42,
                      lineHeight: 1,
                      color: "var(--ink)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {t(tierField(tier.key, "price"))}
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: 22,
                      color: "var(--accent-blue)",
                      fontVariationSettings: '"opsz" 32, "SOFT" 100',
                    }}
                  >
                    {t("pricing.tiers.chip.soon")}
                  </span>
                )}
                <span className="lf-meta" style={{ fontSize: 9.5 }}>
                  / {t(tier.cadenceKey)}
                </span>
              </div>

              <ul className="flex-1 space-y-2.5" style={{ marginBottom: 22 }}>
                {tier.featureKeys.map((fk) => (
                  <li key={fk} className="flex items-start gap-2.5">
                    <Check
                      className="size-3.5 shrink-0"
                      style={{
                        color: `var(--${tone})`,
                        marginTop: 4,
                      }}
                    />
                    <span
                      className="lf-body"
                      style={{ fontSize: 13.5, lineHeight: 1.5 }}
                    >
                      {t(fk)}
                    </span>
                  </li>
                ))}
              </ul>

              {tier.available ? (
                <Link
                  href={tier.ctaHref}
                  className={`lf-cta ${
                    tier.featured ? "lf-cta--primary" : "lf-cta--ghost"
                  } lf-glow w-full justify-center group`}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <span>{t(tierField(tier.key, "cta"))}</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <Link
                  href={tier.ctaHref}
                  className="lf-cta lf-cta--ghost lf-glow"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Sparkles className="size-3" />
                  <span>{t(tierField(tier.key, "cta"))}</span>
                </Link>
              )}

              {tier.footnoteKey && (
                <p
                  className="lf-meta"
                  style={{
                    marginTop: 12,
                    textAlign: "center",
                    fontSize: 9,
                    color: "var(--ink-5)",
                  }}
                >
                  {t(tier.footnoteKey)}
                </p>
              )}
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}

function PricingMatrix() {
  const { t } = useLanguage();
  return (
    <section className="lf-section">
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp}>
          <Kicker n="03" labelKey="pricing.matrix.marker" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <TitleTriple
            preKey="pricing.matrix.title.pre"
            emKey="pricing.matrix.title.em"
          />
        </motion.div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card lf-card--feature"
        style={{ padding: 0, overflow: "hidden" }}
      >
        <div className="overflow-x-auto">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--lf-body)",
            }}
          >
            <thead>
              <tr>
                <th
                  className="text-left align-bottom"
                  style={{
                    padding: "20px 22px",
                    borderBottom: "1px solid var(--line-2)",
                    fontFamily: "var(--lf-mono)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--ink-4)",
                    fontWeight: 500,
                  }}
                >
                  {t("pricing.matrix.col.feature")}
                </th>
                {TIERS.map((tier) => (
                  <th
                    key={tier.key}
                    className="text-center align-bottom"
                    style={{
                      padding: "20px 16px",
                      borderBottom: "1px solid var(--line-2)",
                      borderLeft: "1px solid var(--line-1)",
                      minWidth: 140,
                    }}
                  >
                    <div className="lf-meta lf-meta--accent" style={{ marginBottom: 6 }}>
                      {tier.folio}
                    </div>
                    <div
                      className="lf-h3"
                      style={{ fontSize: 16, marginBottom: 6 }}
                    >
                      {t(tierField(tier.key, "name"))}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontStyle: "italic",
                        fontSize: 16,
                        color: tier.available
                          ? "var(--accent-blue)"
                          : "var(--ink-5)",
                        fontVariationSettings: '"opsz" 24, "SOFT" 100',
                      }}
                    >
                      {tier.available ? t(tierField(tier.key, "price")) : "—"}
                    </div>
                    <div className="lf-meta" style={{ fontSize: 9, marginTop: 2 }}>
                      / {t(tier.cadenceKey)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row, idx) => (
                <tr
                  key={row.labelKey}
                  style={{
                    background:
                      idx % 2 === 0
                        ? "transparent"
                        : "color-mix(in oklab, var(--ink) 2%, transparent)",
                  }}
                >
                  <td
                    className="align-middle"
                    style={{
                      padding: "14px 22px",
                      borderBottom: "1px solid var(--line-1)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: "var(--lf-body)",
                          fontSize: 13.5,
                          color: "var(--ink)",
                          fontWeight: 500,
                        }}
                      >
                        {t(row.labelKey)}
                      </span>
                      {row.hintKey && (
                        <span
                          title={t(row.hintKey)}
                          className="inline-flex cursor-help opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <Info
                            className="size-3"
                            style={{ color: "var(--ink-5)" }}
                            strokeWidth={1.5}
                          />
                        </span>
                      )}
                    </div>
                  </td>
                  {TIERS.map((tier) => (
                    <td
                      key={tier.key}
                      className="text-center align-middle"
                      style={{
                        padding: "14px 16px",
                        borderBottom: "1px solid var(--line-1)",
                        borderLeft: "1px solid var(--line-1)",
                      }}
                    >
                      <MatrixCell value={row.values[tier.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
}

function PricingFAQ() {
  const { t } = useLanguage();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="lf-section">
      <motion.div
        className="lf-section-header"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={fadeUp}>
          <Kicker n="04" labelKey="pricing.faq.marker" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <TitleTriple
            preKey="pricing.faq.title.pre"
            emKey="pricing.faq.title.em"
          />
        </motion.div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card lf-card--feature"
        style={{ padding: 0 }}
      >
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.qKey}
              style={{
                borderBottom:
                  i < FAQ.length - 1 ? "1px solid var(--line-1)" : "none",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-start justify-between gap-6 text-left"
                style={{
                  padding: "20px 24px",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                }}
                aria-expanded={isOpen}
              >
                <div className="flex items-start gap-5">
                  <span
                    className="lf-meta lf-meta--accent"
                    style={{ paddingTop: 3, fontSize: 10 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="lf-h3"
                    style={{ fontSize: 16.5, lineHeight: 1.4 }}
                  >
                    {t(item.qKey)}
                  </span>
                </div>
                <ChevronDown
                  className="size-4 shrink-0 transition-transform"
                  style={{
                    color: "var(--ink-4)",
                    marginTop: 4,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                  strokeWidth={1.5}
                />
              </button>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.36, ease: EASE_OUT }}
                  style={{ padding: "0 24px 22px 64px" }}
                >
                  <p
                    className="lf-body"
                    style={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      maxWidth: "62ch",
                    }}
                  >
                    {t(item.aKey)}
                  </p>
                </motion.div>
              )}
            </div>
          );
        })}
      </motion.div>
    </section>
  );
}

function PricingCTA() {
  const { t } = useLanguage();
  return (
    <section id="waitlist" className="lf-section">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className="lf-card lf-card--feature"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "clamp(28px, 4vw, 56px)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              radial-gradient(ellipse 60% 50% at 80% 20%, color-mix(in oklab, var(--accent-blue) 22%, transparent) 0%, transparent 60%),
              radial-gradient(ellipse 55% 45% at 10% 90%, color-mix(in oklab, var(--emerald) 16%, transparent) 0%, transparent 55%)
            `,
          }}
        />
        <div className="relative grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <div className="lf-section-eyebrow">
              <span className="lf-section-eyebrow-rule" />
              <span className="lf-meta lf-meta--accent">§ 05</span>
              <span className="lf-meta">{t("pricing.cta.markerLabel")}</span>
            </div>
            <TitleTriple
              preKey="pricing.cta.title.pre"
              emKey="pricing.cta.title.em"
              variant="h1"
            />
            <p
              className="lf-section-deck"
              style={{ marginTop: 14, maxWidth: "58ch" }}
            >
              {t("pricing.cta.standfirst")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/sign-up"
              className="lf-cta lf-cta--primary lf-glow"
              style={{ justifyContent: "center" }}
            >
              <span>{t("pricing.cta.cta1")}</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/chat"
              className="lf-cta lf-cta--ghost lf-glow"
              style={{ justifyContent: "center" }}
            >
              <span>{t("pricing.cta.cta2")}</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ───────────────── Main ───────────────── */

export function PricingContent(): ReactNode {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "light";

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />
        <main>
          <PricingHero />
          <PricingTiers />
          <PricingMatrix />
          <PricingFAQ />
          <PricingCTA />
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
