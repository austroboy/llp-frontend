"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useQuery } from "convex/react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  ArrowRight,
  Check,
  Feather,
  Gavel,
  PenLine,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Stamp,
  X,
} from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { useLanguage } from "@/hooks/use-language";
import { LazyImage } from "@/components/lazy-image";
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

/* ───────────────── Types ───────────────── */

type BlogPostLite = {
  _id: string;
  slug: string;
  title: string;
  titleBn?: string;
  excerpt: string;
  excerptBn?: string;
  category: "official" | "community";
  coverImageId?: Id<"_storage">;
  authorName: string;
  authorRole?: string;
  authorInitials: string;
  tags?: string[];
  readTimeMinutes?: number;
  publishedAt?: number;
};

function useCoverUrl(coverImageId?: Id<"_storage">) {
  const url = useQuery(
    api.files.getUrl,
    coverImageId ? { storageId: coverImageId } : "skip"
  );
  const loading = Boolean(coverImageId) && url === undefined;
  return { url: url ?? null, loading };
}

/* ───────────────── Main ───────────────── */

export function BlogContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  const { t, language } = useLanguage();
  const { isSignedIn } = useUser();
  const [filter, setFilter] = useState<"all" | "official" | "community">("all");

  const publishedPosts = useQuery(api.blogPosts.getPublished, {}) as
    | BlogPostLite[]
    | undefined;

  const { lead, rest, counts } = useMemo(() => {
    if (!publishedPosts) {
      return {
        lead: null,
        rest: null,
        counts: { all: 0, official: 0, community: 0 },
      };
    }
    const officialCount = publishedPosts.filter((p) => p.category === "official").length;
    const communityCount = publishedPosts.filter((p) => p.category === "community").length;
    const leadPost = publishedPosts[0] ?? null;
    const remainder = publishedPosts.slice(1);
    const filtered =
      filter === "all" ? remainder : remainder.filter((p) => p.category === filter);
    return {
      lead: leadPost,
      rest: filtered,
      counts: { all: publishedPosts.length, official: officialCount, community: communityCount },
    };
  }, [publishedPosts, filter]);

  const currentYear = new Date().getFullYear();
  const loading = publishedPosts === undefined;

  const localized = (p: BlogPostLite) => ({
    title: language === "bn" && p.titleBn ? p.titleBn : p.title,
    excerpt: language === "bn" && p.excerptBn ? p.excerptBn : p.excerpt,
  });

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />

        <main>
          {/* ─── § I · Masthead ─────────────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ I</span>The Gazette
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="lf-meta"
                style={{ marginBottom: 18 }}
              >
                The LLP Gazette ·{" "}
                <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                  Vol. I
                </span>{" "}
                · No.{" "}
                <span style={{ color: "var(--ink-2)" }}>
                  {loading ? "—" : String(counts.all).padStart(2, "0")}
                </span>{" "}
                · Dhaka · {currentYear}
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="lf-h2"
                style={{
                  fontSize: "clamp(36px, 4.6vw, 56px)",
                  maxWidth: "16ch",
                }}
              >
                The record of <em>workplace law,</em> written by those who practise it.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 18, maxWidth: "58ch" }}
              >
                Two streams, one editorial standard. Official guidance from the LLP
                compliance desk; peer-reviewed dispatches from practitioners on the
                floor of Bangladesh&apos;s workplaces, factories, and courts.
              </motion.p>
            </motion.div>

            {/* Dual desk cards */}
            <motion.div
              className="grid gap-5 md:grid-cols-2"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-card lf-card--feature">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2.5">
                    <Gavel style={{ width: 14, height: 14, color: "var(--accent-blue)" }} />
                    <span className="lf-meta lf-meta--accent">Official Desk</span>
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: 24,
                      color: "var(--accent-blue)",
                      fontVariationSettings: '"opsz" 32, "SOFT" 100',
                      lineHeight: 1,
                    }}
                  >
                    {loading ? "—" : String(counts.official).padStart(2, "0")}
                  </span>
                </div>
                <p className="lf-body" style={{ marginTop: 14 }}>
                  LLP compliance team dispatches on amendments, inspection protocols,
                  and interpretive guidance — citation-backed and audit-ready.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} className="lf-card lf-card--feature">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2.5">
                    <Feather style={{ width: 14, height: 14, color: "var(--emerald)" }} />
                    <span className="lf-meta lf-meta--emerald">Practitioner Bench</span>
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--lf-display)",
                      fontStyle: "italic",
                      fontSize: 24,
                      color: "var(--emerald)",
                      fontVariationSettings: '"opsz" 32, "SOFT" 100',
                      lineHeight: 1,
                    }}
                  >
                    {loading ? "—" : String(counts.community).padStart(2, "0")}
                  </span>
                </div>
                <p className="lf-body" style={{ marginTop: 14 }}>
                  Case studies, shop-floor reports, and implementation notes from HR
                  leads, advocates, and safety officers. Peer-reviewed before publication.
                </p>
              </motion.div>
            </motion.div>

            {/* Editor's note */}
            <motion.div
              className="lf-pulse-review"
              style={{ marginTop: "var(--s-6)", maxWidth: "780px" }}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inViewOnce}
              transition={{ duration: 0.55, ease: EASE_OUT }}
            >
              <span className="lf-pulse-review-label">Editor&apos;s note</span>
              <p className="lf-pulse-review-text">
                &ldquo;A worker&apos;s right is only as enforceable as the record that
                documents it. The Gazette exists to make that record public, precise,
                and auditable — in both English and বাংলা.&rdquo;
              </p>
            </motion.div>
          </section>

          {/* ─── § II · Lead Opinion ────────────────────────────────── */}
          {(loading || lead) && (
            <section className="lf-section">
              <motion.div
                className="lf-section-header"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                <motion.div variants={fadeUp} className="lf-kicker">
                  <span className="lf-kicker-mark">§ II</span>Lead Opinion
                </motion.div>
              </motion.div>

              {loading ? (
                <LeadSkeleton />
              ) : (
                lead && (
                  <LeadOpinionCard
                    post={lead}
                    title={localized(lead).title}
                    excerpt={localized(lead).excerpt}
                  />
                )
              )}
            </section>
          )}

          {/* ─── § III · Registry ───────────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ III</span>The Registry
              </motion.div>

              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <motion.h2 variants={fadeUp} className="lf-h2">
                    {t("blog.articles.title")}
                  </motion.h2>
                  <motion.p
                    variants={fadeUp}
                    className="lf-section-deck"
                    style={{ marginTop: 10, maxWidth: "56ch" }}
                  >
                    {t("blog.articles.subtitle")}
                  </motion.p>
                </div>
                {isSignedIn && (
                  <Link
                    href="/dashboard/blog?new=1"
                    className="lf-cta lf-cta--ghost lf-glow"
                  >
                    <PenLine style={{ width: 13, height: 13 }} />
                    New Manuscript
                  </Link>
                )}
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="lf-tabs" style={{ marginBottom: "var(--s-5)" }}>
              {(
                [
                  { key: "all", label: t("blog.filter.all"), count: counts.all },
                  { key: "official", label: t("blog.filter.official"), count: counts.official },
                  { key: "community", label: t("blog.filter.community"), count: counts.community },
                ] as const
              ).map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`lf-tab ${filter === key ? "lf-tab--active" : ""}`}
                >
                  <span>{label}</span>
                  <span className="lf-tab-count">
                    {loading ? "—" : String(count).padStart(2, "0")}
                  </span>
                </button>
              ))}
              <span
                className="lf-meta hidden md:inline-flex"
                style={{ marginLeft: "auto", paddingBottom: 12, fontSize: 10 }}
              >
                Sort · Newest first
              </span>
            </div>

            {loading ? (
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <RegistrySkeleton key={i} />
                ))}
              </div>
            ) : !rest || rest.length === 0 ? (
              <EmptyRegistry filter={filter} />
            ) : (
              <motion.div
                className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
              >
                {rest.map((post, i) => {
                  const { title, excerpt } = localized(post);
                  return (
                    <RegistryCard
                      key={post._id}
                      post={post}
                      index={i + 1}
                      title={title}
                      excerpt={excerpt}
                    />
                  );
                })}
              </motion.div>
            )}
          </section>

          {/* ─── § IV · Editorial Board ─────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ IV</span>The Editorial Board
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-h2">
                {t("blog.contribute.title").replace(/\.$/, "")}.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 10 }}
              >
                {t("blog.contribute.subtitle")} Every manuscript passes through a
                three-desk review before it carries the Gazette&apos;s imprint.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid gap-5 md:grid-cols-3"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {[
                {
                  n: "i",
                  icon: PenLine,
                  title: t("blog.contribute.write.title"),
                  desc: t("blog.contribute.write.desc"),
                  tone: "accent-blue",
                },
                {
                  n: "ii",
                  icon: ShieldCheck,
                  title: t("blog.contribute.verify.title"),
                  desc: t("blog.contribute.verify.desc"),
                  tone: "emerald",
                },
                {
                  n: "iii",
                  icon: Stamp,
                  title: t("blog.contribute.profile.title"),
                  desc: t("blog.contribute.profile.desc"),
                  tone: "bronze",
                },
              ].map(({ n, icon: Icon, title, desc, tone }, i) => (
                <motion.div
                  key={n}
                  variants={fadeUp}
                  className="lf-card lf-card--hover"
                >
                  <div
                    className="flex items-center justify-between"
                    style={{ marginBottom: 18 }}
                  >
                    <span className="lf-meta lf-meta--accent">§ {n.toUpperCase()}</span>
                    <span className="lf-meta" style={{ fontSize: 9.5 }}>
                      Step {i + 1} / 3
                    </span>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--r-md)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `color-mix(in oklab, var(--${tone}) 14%, transparent)`,
                      color: `var(--${tone})`,
                      marginBottom: 16,
                      border: `1px solid color-mix(in oklab, var(--${tone}) 26%, transparent)`,
                    }}
                  >
                    <Icon style={{ width: 20, height: 20 }} />
                  </div>
                  <h3 className="lf-h3">{title}</h3>
                  <p className="lf-body" style={{ marginTop: 10 }}>
                    {desc}
                  </p>
                  <div
                    className="lf-meta"
                    style={{
                      marginTop: 18,
                      paddingTop: 16,
                      borderTop: "1px solid var(--line-1)",
                      fontSize: 9.5,
                    }}
                  >
                    Protocol {String(i + 1).padStart(2, "0")}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── § V · Editorial Standards ──────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ V</span>Editorial Standards
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-h2">
                {t("blog.guidelines.title")}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 10 }}
              >
                The Gazette is a matter of record. These are the standards the
                editorial board applies before any manuscript earns the imprint.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid gap-5 md:grid-cols-2"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-card">
                <div
                  className="flex items-center gap-3"
                  style={{
                    marginBottom: 18,
                    paddingBottom: 14,
                    borderBottom: "1px solid var(--line-1)",
                  }}
                >
                  <span className="lf-meta lf-meta--emerald">§ V.a</span>
                  <span className="lf-h3" style={{ fontSize: 18 }}>
                    {t("blog.guidelines.publishTitle")}
                  </span>
                </div>
                <ul className="lf-runlist">
                  {[
                    "blog.guidelines.publish1",
                    "blog.guidelines.publish2",
                    "blog.guidelines.publish3",
                    "blog.guidelines.publish4",
                    "blog.guidelines.publish5",
                    "blog.guidelines.publish6",
                  ].map((k) => (
                    <li key={k}>
                      <Check
                        style={{
                          width: 14,
                          height: 14,
                          color: "var(--emerald)",
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />
                      <span className="lf-runlist-text">{t(k)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div variants={fadeUp} className="lf-card">
                <div
                  className="flex items-center gap-3"
                  style={{
                    marginBottom: 18,
                    paddingBottom: 14,
                    borderBottom: "1px solid var(--line-1)",
                  }}
                >
                  <span className="lf-meta lf-meta--bronze">§ V.b</span>
                  <span className="lf-h3" style={{ fontSize: 18 }}>
                    {t("blog.guidelines.rejectTitle")}
                  </span>
                </div>
                <ul className="lf-runlist">
                  {[
                    "blog.guidelines.reject1",
                    "blog.guidelines.reject2",
                    "blog.guidelines.reject3",
                    "blog.guidelines.reject4",
                    "blog.guidelines.reject5",
                    "blog.guidelines.reject6",
                  ].map((k) => (
                    <li key={k}>
                      <X
                        style={{
                          width: 14,
                          height: 14,
                          color: "var(--bronze)",
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />
                      <span className="lf-runlist-text">{t(k)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          </section>

          {/* ─── § VI · Submit a Manuscript ─────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ VI</span>Submit a Manuscript
              </motion.div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
              className="lf-card lf-card--feature"
              style={{ position: "relative", overflow: "hidden" }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: -36,
                  right: -16,
                  fontFamily: "var(--lf-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(180px, 22vw, 320px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.06em",
                  color: "color-mix(in oklab, var(--accent-blue) 9%, transparent)",
                  pointerEvents: "none",
                  fontVariationSettings: '"opsz" 144, "SOFT" 100',
                }}
              >
                ¶
              </span>
              <div
                className="grid gap-8 md:grid-cols-[1.2fr_1fr]"
                style={{ position: "relative" }}
              >
                <div>
                  <span className="lf-meta lf-meta--accent">Open to contributors</span>
                  <h2 className="lf-h2" style={{ marginTop: 12 }}>
                    Write from the <em>floor.</em> Earn the imprint.
                  </h2>
                  <p
                    className="lf-section-deck"
                    style={{ marginTop: 14, maxWidth: "52ch" }}
                  >
                    HR managers, compliance officers, safety leads, advocates, and
                    labour-law scholars — the Gazette publishes the people who live
                    the law in practice. Every by-line carries full credentials.
                  </p>
                  <div
                    className="flex flex-wrap gap-3"
                    style={{ marginTop: 26 }}
                  >
                    <Link
                      href="/dashboard/blog?new=1"
                      className="lf-cta lf-cta--primary lf-glow"
                    >
                      <Feather style={{ width: 13, height: 13 }} />
                      Start Manuscript
                      <ArrowRight style={{ width: 13, height: 13 }} />
                    </Link>
                    <Link
                      href="mailto:editorial@laborlawpartner.com"
                      className="lf-cta lf-cta--ghost lf-glow"
                    >
                      Contact Editor
                    </Link>
                  </div>
                  <div
                    className="lf-meta"
                    style={{ marginTop: 22, fontSize: 10 }}
                  >
                    Review · 5–10 business days · Peer-reviewed · EN / বাংলা
                  </div>
                </div>
                <div>
                  <div
                    className="lf-meta"
                    style={{
                      paddingBottom: 14,
                      marginBottom: 14,
                      borderBottom: "1px solid var(--line-1)",
                      fontSize: 10,
                    }}
                  >
                    The Imprint Guarantees
                  </div>
                  <ul className="lf-runlist">
                    {[
                      "Peer review by the LLP compliance desk",
                      "Your full by-line, role, and credentials",
                      "Citation-linked to the Universe registry",
                      "Permanent archival in the Gazette record",
                    ].map((g, i) => (
                      <li key={g}>
                        <span className="lf-runlist-num">
                          {String(i + 1).padStart(2, "0")}.
                        </span>
                        <span className="lf-runlist-text">{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ─── § VII · Consult CTA ────────────────────────────────── */}
          <section className="lf-section">
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
                    radial-gradient(ellipse 60% 50% at 18% 25%, color-mix(in oklab, var(--accent-blue) 22%, transparent) 0%, transparent 60%),
                    radial-gradient(ellipse 55% 45% at 82% 80%, color-mix(in oklab, var(--bronze) 14%, transparent) 0%, transparent 55%)
                  `,
                }}
              />
              <div style={{ position: "relative" }}>
                <div className="lf-section-eyebrow">
                  <span className="lf-section-eyebrow-rule" />
                  <span className="lf-meta lf-meta--accent">§ VII</span>
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    Consult the Registry
                  </span>
                </div>
                <h2 className="lf-h2" style={{ maxWidth: "22ch" }}>
                  {t("blog.cta.headline").replace(/\.$/, "")}.{" "}
                  <em>Audit it, cite it, act on it.</em>
                </h2>
                <p
                  className="lf-section-deck"
                  style={{ marginTop: 14, maxWidth: "56ch" }}
                >
                  {t("blog.cta.subline")}
                </p>
                <div
                  className="flex flex-wrap items-center gap-3"
                  style={{ marginTop: 28 }}
                >
                  <Link href="/chat" className="lf-cta lf-cta--primary lf-glow">
                    <Sparkles style={{ width: 13, height: 13 }} />
                    {t("blog.cta.aiSearch")}
                    <ArrowRight style={{ width: 13, height: 13 }} />
                  </Link>
                  <Link
                    href="/documents"
                    className="lf-cta lf-cta--ghost lf-glow"
                  >
                    <ScrollText style={{ width: 13, height: 13 }} />
                    {t("blog.cta.docs")}
                  </Link>
                </div>
                <div
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
                  style={{
                    marginTop: 36,
                    paddingTop: 20,
                    borderTop: "1px solid var(--line-1)",
                  }}
                >
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    Colophon · Gazette · Published monthly · Peer-reviewed
                  </span>
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    Est · Dhaka · {currentYear}
                  </span>
                </div>
              </div>
            </motion.div>
          </section>
        </main>

        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}

/* ───────────────── Cards ───────────────── */

function RegistryCard({
  post,
  index,
  title,
  excerpt,
}: {
  post: BlogPostLite;
  index: number;
  title: string;
  excerpt: string;
}) {
  const { url, loading } = useCoverUrl(post.coverImageId);
  const isOfficial = post.category === "official";
  const tone = isOfficial ? "accent-blue" : "emerald";
  const cat = isOfficial ? "LLP Desk" : "Practitioner Bench";
  const folio = `§ ${String(index).padStart(3, "0")}`;

  return (
    <motion.div variants={fadeUp} style={{ display: "flex" }}>
      <Link
        href={`/blog/${post.slug}`}
        className="lf-card lf-card--hover"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          width: "100%",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="lf-meta lf-meta--accent">{folio}</span>
          <span
            style={{
              fontFamily: "var(--lf-mono)",
              fontSize: 9.5,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: `var(--${tone})`,
              padding: "3px 10px",
              borderRadius: 999,
              background: `color-mix(in oklab, var(--${tone}) 12%, transparent)`,
              border: `1px solid color-mix(in oklab, var(--${tone}) 24%, transparent)`,
            }}
          >
            {cat}
          </span>
        </div>

        <div className="lf-cover">
          {loading ? (
            <div
              className="absolute inset-0 animate-pulse"
              style={{ background: "var(--paper-warm)" }}
            />
          ) : (
            <LazyImage
              alt={title}
              containerClassName=""
              fallback="https://placehold.co/800x500?text=LLP+Gazette"
              inView={true}
              ratio={16 / 10}
              src={url ?? "https://placehold.co/800x500?text=LLP+Gazette"}
            />
          )}
        </div>

        <h3
          className="lf-h3"
          style={{
            fontSize: 19,
            lineHeight: 1.25,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h3>

        <p
          className="lf-body"
          style={{
            fontSize: 14,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {excerpt}
        </p>

        <div
          className="flex items-end justify-between gap-3"
          style={{
            marginTop: "auto",
            paddingTop: 14,
            borderTop: "1px solid var(--line-1)",
          }}
        >
          <div className="min-w-0">
            <div
              style={{
                fontFamily: "var(--lf-display)",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--ink-2)",
                lineHeight: 1.25,
                fontVariationSettings: '"opsz" 20, "SOFT" 100',
              }}
            >
              by {post.authorName}
            </div>
            {post.authorRole && (
              <div
                className="lf-meta truncate"
                style={{ marginTop: 2, fontSize: 9.5 }}
              >
                {post.authorRole}
              </div>
            )}
          </div>
          <div
            className="lf-meta shrink-0 text-right"
            style={{ fontSize: 9.5 }}
          >
            {post.publishedAt && (
              <span>
                {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            {post.readTimeMinutes && <span> · {post.readTimeMinutes} min</span>}
          </div>
        </div>

        <span
          className="lf-meta lf-meta--accent inline-flex items-center"
          style={{ gap: 6 }}
        >
          Read opinion
          <ArrowRight
            className="lf-card-arrow"
            style={{
              width: 12,
              height: 12,
              transition: "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          />
        </span>
      </Link>
    </motion.div>
  );
}

function LeadOpinionCard({
  post,
  title,
  excerpt,
}: {
  post: BlogPostLite;
  title: string;
  excerpt: string;
}) {
  const { url, loading } = useCoverUrl(post.coverImageId);
  const isOfficial = post.category === "official";
  const tone = isOfficial ? "accent-blue" : "emerald";
  const dateStr = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
    >
      <Link
        href={`/blog/${post.slug}`}
        className="lf-card lf-card--feature lf-card--hover"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 0,
          padding: 0,
          overflow: "hidden",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div className="md:grid md:grid-cols-[1.1fr_1fr]">
          <div
            style={{
              position: "relative",
              minHeight: 280,
              overflow: "hidden",
              borderRight: "1px solid var(--glass-border)",
              background: "var(--paper-warm)",
            }}
          >
            {loading ? (
              <div
                className="absolute inset-0 animate-pulse"
                style={{ background: "var(--paper-warm)" }}
              />
            ) : (
              <LazyImage
                alt={title}
                className="h-full w-full object-cover"
                containerClassName="absolute inset-0"
                fallback="https://placehold.co/900x600?text=Lead+Opinion"
                inView={true}
                ratio={3 / 2}
                src={url ?? "https://placehold.co/900x600?text=Lead+Opinion"}
              />
            )}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(120deg, transparent 35%, color-mix(in oklab, var(--paper) 55%, transparent) 100%)",
                mixBlendMode: "multiply",
              }}
            />
            <div
              className="absolute top-4 left-4 inline-flex items-center gap-2"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background:
                  "color-mix(in oklab, var(--ink) 72%, transparent)",
                backdropFilter: "blur(8px) saturate(140%)",
                WebkitBackdropFilter: "blur(8px) saturate(140%)",
                border: "1px solid rgba(255,255,255,0.16)",
              }}
            >
              <Stamp
                style={{ width: 11, height: 11, color: `var(--${tone})` }}
              />
              <span
                style={{
                  fontFamily: "var(--lf-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#f0e8d8",
                  fontWeight: 600,
                }}
              >
                Lead Opinion · Current Edition
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "clamp(24px, 3vw, 40px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="flex items-center gap-3"
              style={{
                paddingBottom: 16,
                borderBottom: "1px solid var(--line-1)",
              }}
            >
              <span className="lf-meta lf-meta--accent">§ Folio 001</span>
              <span
                aria-hidden
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--line-2)",
                }}
              />
              <span
                className="lf-meta"
                style={{
                  color: `var(--${tone})`,
                  fontWeight: 600,
                }}
              >
                {isOfficial ? "LLP Desk" : "Practitioner Bench"}
              </span>
            </div>

            <h2
              className="lf-h2"
              style={{
                marginTop: 22,
                fontSize: "clamp(26px, 3.1vw, 36px)",
                lineHeight: 1.12,
              }}
            >
              {title}
            </h2>

            <p
              className="lf-section-deck"
              style={{ marginTop: 14 }}
            >
              {excerpt}
            </p>

            <span
              className="lf-meta lf-meta--accent inline-flex items-center self-start"
              style={{ marginTop: 22, gap: 8 }}
            >
              Read full opinion
              <ArrowRight
                className="lf-card-arrow"
                style={{
                  width: 13,
                  height: 13,
                  transition: "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
              />
            </span>

            <div
              className="flex items-center gap-3"
              style={{
                marginTop: "auto",
                paddingTop: 22,
                borderTop: "1px solid var(--line-1)",
              }}
            >
              <span
                className="inline-flex items-center justify-center shrink-0"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: `1px solid color-mix(in oklab, var(--${tone}) 30%, transparent)`,
                  background: `color-mix(in oklab, var(--${tone}) 12%, transparent)`,
                  color: `var(--${tone})`,
                  fontFamily: "var(--lf-display)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontVariationSettings: '"opsz" 24',
                }}
              >
                {post.authorInitials}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate"
                  style={{
                    fontFamily: "var(--lf-display)",
                    fontStyle: "italic",
                    fontSize: 15,
                    color: "var(--ink)",
                    lineHeight: 1.2,
                    fontVariationSettings: '"opsz" 24, "SOFT" 100',
                  }}
                >
                  by {post.authorName}
                </div>
                <div
                  className="lf-meta truncate"
                  style={{ marginTop: 2, fontSize: 10 }}
                >
                  {post.authorRole || "Contributor"}
                  {dateStr && ` · ${dateStr}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ───────────────── Skeletons + empty state ───────────────── */

function LeadSkeleton() {
  return (
    <div className="lf-card lf-card--feature animate-pulse" style={{ padding: 0 }}>
      <div className="md:grid md:grid-cols-[1.1fr_1fr]">
        <div
          style={{
            minHeight: 280,
            background: "var(--paper-warm)",
            borderRight: "1px solid var(--glass-border)",
          }}
        />
        <div className="space-y-5" style={{ padding: 32 }}>
          <div className="h-3 w-40" style={{ background: "var(--line-2)" }} />
          <div className="h-7 w-5/6" style={{ background: "var(--line-2)" }} />
          <div className="h-7 w-2/3" style={{ background: "var(--line-2)" }} />
          <div className="h-4 w-full" style={{ background: "var(--line-1)" }} />
          <div className="h-4 w-4/5" style={{ background: "var(--line-1)" }} />
        </div>
      </div>
    </div>
  );
}

function RegistrySkeleton() {
  return (
    <div className="lf-card animate-pulse">
      <div
        style={{
          aspectRatio: "16/10",
          background: "var(--paper-warm)",
          borderRadius: "var(--r-md)",
          marginBottom: 16,
        }}
      />
      <div
        className="h-4 w-3/4"
        style={{ background: "var(--line-2)", marginBottom: 12 }}
      />
      <div
        className="h-3 w-full"
        style={{ background: "var(--line-1)", marginBottom: 8 }}
      />
      <div className="h-3 w-4/5" style={{ background: "var(--line-1)" }} />
    </div>
  );
}

function EmptyRegistry({ filter }: { filter: "all" | "official" | "community" }) {
  const label =
    filter === "official"
      ? "Official Desk"
      : filter === "community"
        ? "Practitioner Bench"
        : "The Registry";

  return (
    <div
      className="lf-card text-center"
      style={{
        padding: "clamp(40px, 6vw, 80px) 24px",
        borderStyle: "dashed",
      }}
    >
      <span
        aria-hidden
        className="inline-block"
        style={{
          width: 12,
          height: 12,
          transform: "rotate(45deg)",
          border: "1px solid var(--accent-blue)",
          marginBottom: 18,
        }}
      />
      <h3 className="lf-h3" style={{ fontSize: 20 }}>
        No entries in {label} — yet.
      </h3>
      <p
        className="lf-body mx-auto"
        style={{ marginTop: 10, maxWidth: 460 }}
      >
        The imprint waits for its first dispatch. Contributors who pass peer review
        will appear here, folio by folio.
      </p>
    </div>
  );
}
