"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { useTheme } from "next-themes";
import { ArrowLeft, BookOpen, Scale, Gavel } from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { useLanguage } from "@/hooks/use-language";
import { sanitize, chapterSchema } from "@/lib/sanitize-html";
import "@/components/landing/landing.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

interface ChapterData {
  id: number;
  parent_law: string;
  chapter_number: string;
  title: string;
  title_bn: string | null;
  sections_range: string | null;
  content_html: string;
  content_text: string | null;
}

export function ChapterReader({ chapter }: { chapter: ChapterData }) {
  const { t, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeAttr = mounted ? resolvedTheme : undefined;

  const lawName =
    chapter.parent_law === "act"
      ? t("resources.chapters.labourAct")
      : t("resources.chapters.labourRules");

  const chTitle =
    language === "bn" && chapter.title_bn ? chapter.title_bn : chapter.title;

  const LawIcon = chapter.parent_law === "act" ? Scale : Gavel;

  return (
    <MotionConfig reducedMotion="user">
      <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
        <SiteTopNav />
        <main>
          <section
            className="lf-section"
            style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
          >
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              style={{
                maxWidth: "880px",
                marginInline: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-5)",
              }}
            >
              <motion.div variants={fadeUp}>
                <Link
                  href="/resources"
                  className="lf-cta lf-cta--ghost lf-glow"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <ArrowLeft className="size-4" />
                  {t("resources.backToResources")}
                </Link>
              </motion.div>

              <motion.header
                variants={fadeUp}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-3)",
                }}
              >
                <span
                  className="lf-meta lf-meta--accent"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <LawIcon className="size-4" />
                  {lawName}
                </span>
                <h1 className="lf-h2">
                  {t("resources.chapter")} {chapter.chapter_number}: {chTitle}
                </h1>
                {chapter.sections_range && (
                  <span
                    className="lf-tag"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", alignSelf: "flex-start" }}
                  >
                    <BookOpen className="size-3" />
                    {t("resources.sections")} {chapter.sections_range}
                  </span>
                )}
              </motion.header>

              <motion.article
                variants={fadeUp}
                className="lf-card lf-card--feature"
              >
                <div
                  className="lf-body prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-table:text-sm prose-td:border prose-td:p-2 prose-th:border prose-th:p-2"
                  // C-7 XSS: chapter.content_html sanitized via sanitize-html (chapterSchema).
                  dangerouslySetInnerHTML={{ __html: sanitize(chapter.content_html, chapterSchema) }}
                />
              </motion.article>

              <motion.div
                variants={fadeUp}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  paddingTop: "var(--s-3)",
                }}
              >
                <Link
                  href="/resources"
                  className="lf-cta lf-cta--primary lf-glow"
                >
                  {t("resources.backToResources")}
                </Link>
              </motion.div>
            </motion.div>
          </section>
        </main>
        <HomepageFooter />
      </div>
    </MotionConfig>
  );
}
