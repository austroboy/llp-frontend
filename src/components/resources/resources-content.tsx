"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, MotionConfig, type Variants } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Download,
  FolderOpen,
  Library,
  Sparkles,
} from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { useLanguage } from "@/hooks/use-language";
import { ResourceDownloads } from "./resource-downloads";
import { ResourceChapters } from "./resource-chapters";
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

interface Category {
  id: number;
  name: string;
  name_bn: string | null;
  slug: string;
  sort_order: number;
}

interface ResourceFile {
  id: number;
  category_id: number;
  title: string;
  title_bn: string | null;
  file_name: string;
  storage_path: string;
  public_url: string | null;
  language: string;
  file_size_bytes: number | null;
  file_size_display: string | null;
  sort_order: number;
}

export interface Chapter {
  id: number;
  parent_law: "act" | "rules";
  chapter_number: string;
  title: string;
  title_bn: string | null;
  sections_range: string | null;
  sort_order: number;
}

type TabKey = "downloads" | "chapters";

/* ───────────────── Main ───────────────── */

export function ResourcesContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeAttr = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : "light";

  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("downloads");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [resFiles, resChapters] = await Promise.all([
        fetch("/api/resources").then((r) => r.json()),
        fetch("/api/resources/chapters").then((r) => r.json()),
      ]);
      setCategories(resFiles.categories || []);
      setFiles(resFiles.files || []);
      setChapters(resChapters.chapters || []);
      setLoading(false);
    }
    load();
  }, []);

  const downloadCount = files.length;
  const chapterCount = chapters.length;
  const categoryCount = categories.length;
  const currentYear = new Date().getFullYear();

  const tabs: { key: TabKey; label: string; count: number }[] = [
    {
      key: "downloads",
      label: t("resources.tab.downloads"),
      count: downloadCount,
    },
    {
      key: "chapters",
      label: t("resources.tab.chapters"),
      count: chapterCount,
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />

        <main>
          {/* ─── § I · Masthead ─────────────────────────────────────── */}
          <section
            className="lf-section"
            style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
          >
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ I</span>The Resource Centre
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="lf-meta"
                style={{ marginBottom: 18 }}
              >
                LLP Resource Centre ·{" "}
                <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                  Vol. I
                </span>{" "}
                ·{" "}
                <span style={{ color: "var(--ink-2)" }}>
                  {loading ? "—" : String(downloadCount).padStart(2, "0")}{" "}
                  documents
                </span>{" "}
                · Dhaka · {currentYear}
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="lf-h2"
                style={{
                  fontSize: "clamp(36px, 4.6vw, 56px)",
                  maxWidth: "18ch",
                }}
              >
                {t("resources.title").replace(/\.$/, "")}{" "}
                <em>— the working library.</em>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 18, maxWidth: "60ch" }}
              >
                {t("resources.subtitle")}
              </motion.p>
            </motion.div>

            {/* Stat strip — categories / downloads / chapters */}
            <motion.div
              className="grid gap-5 md:grid-cols-3"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              {[
                {
                  icon: FolderOpen,
                  tone: "accent-blue" as const,
                  label: t("resources.admin.categories"),
                  count: categoryCount,
                  desc: "Curated channels — wage notices, gazettes, court precedent, official forms.",
                },
                {
                  icon: Download,
                  tone: "emerald" as const,
                  label: t("resources.tab.downloads"),
                  count: downloadCount,
                  desc: "Audit-ready PDFs in English and বাংলা — the originals, citation-linked.",
                },
                {
                  icon: BookOpen,
                  tone: "bronze" as const,
                  label: t("resources.tab.chapters"),
                  count: chapterCount,
                  desc: "The Labour Act and Rules, mapped chapter by chapter for in-line reading.",
                },
              ].map(({ icon: Icon, tone, label, count, desc }) => (
                <motion.div
                  key={label}
                  variants={fadeUp}
                  className="lf-card lf-card--feature"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2.5">
                      <Icon
                        style={{
                          width: 14,
                          height: 14,
                          color: `var(--${tone})`,
                        }}
                      />
                      <span
                        className={`lf-meta lf-meta--${
                          tone === "accent-blue" ? "accent" : tone
                        }`}
                      >
                        {label}
                      </span>
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--lf-display)",
                        fontStyle: "italic",
                        fontSize: 24,
                        color: `var(--${tone})`,
                        fontVariationSettings: '"opsz" 32, "SOFT" 100',
                        lineHeight: 1,
                      }}
                    >
                      {loading ? "—" : String(count).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="lf-body" style={{ marginTop: 14 }}>
                    {desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── § II · The Stacks ──────────────────────────────────── */}
          <section className="lf-section">
            <motion.div
              className="lf-section-header"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={inViewOnce}
            >
              <motion.div variants={fadeUp} className="lf-kicker">
                <span className="lf-kicker-mark">§ II</span>The Stacks
              </motion.div>
              <motion.h2 variants={fadeUp} className="lf-h2">
                Browse by <em>shelf</em>, or read by chapter.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="lf-section-deck"
                style={{ marginTop: 10, maxWidth: "56ch" }}
              >
                Two ways through the library. Pull a PDF for the original
                gazette, or step inside a chapter to read the working text in
                place.
              </motion.p>
            </motion.div>

            {/* Tabs */}
            <div className="lf-tabs" style={{ marginBottom: "var(--s-5)" }}>
              {tabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`lf-tab ${activeTab === key ? "lf-tab--active" : ""}`}
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
                Sort · By category
              </span>
            </div>

            {/* Tab panel */}
            {loading ? (
              <LoadingSkeleton />
            ) : activeTab === "downloads" ? (
              <ResourceDownloads
                categories={categories}
                files={files}
                language={language}
              />
            ) : (
              <ResourceChapters chapters={chapters} language={language} />
            )}
          </section>

          {/* ─── § III · Consult CTA ────────────────────────────────── */}
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
                  <span className="lf-meta lf-meta--accent">§ III</span>
                  <span className="lf-meta" style={{ fontSize: 10 }}>
                    Consult the Registry
                  </span>
                </div>
                <h2 className="lf-h2" style={{ maxWidth: "22ch" }}>
                  Need an answer, not a download?{" "}
                  <em>Ask the Universe directly.</em>
                </h2>
                <p
                  className="lf-section-deck"
                  style={{ marginTop: 14, maxWidth: "56ch" }}
                >
                  The same documents power LLP&apos;s AI search — citation-linked,
                  bilingual, and audit-ready.
                </p>
                <div
                  className="flex flex-wrap items-center gap-3"
                  style={{ marginTop: 28 }}
                >
                  <Link href="/chat" className="lf-cta lf-cta--primary lf-glow">
                    <Sparkles style={{ width: 13, height: 13 }} />
                    Ask LLP
                    <ArrowRight style={{ width: 13, height: 13 }} />
                  </Link>
                  <Link
                    href="/documents"
                    className="lf-cta lf-cta--ghost lf-glow"
                  >
                    <Library style={{ width: 13, height: 13 }} />
                    Document Index
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
                    Colophon · Resource Centre · EN / বাংলা · Updated quarterly
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

/* ───────────────── Skeleton ───────────────── */

function LoadingSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="lf-card animate-pulse flex items-center gap-4"
          style={{ padding: 16 }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--r-md)",
              background: "var(--line-2)",
              flexShrink: 0,
            }}
          />
          <div className="flex-1 space-y-2">
            <div
              className="h-4 w-3/4"
              style={{ background: "var(--line-2)" }}
            />
            <div
              className="h-3 w-1/2"
              style={{ background: "var(--line-1)" }}
            />
          </div>
          <div
            className="h-8 w-20"
            style={{ background: "var(--line-2)", borderRadius: 999 }}
          />
        </div>
      ))}
    </div>
  );
}
