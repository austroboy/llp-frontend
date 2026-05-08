"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Gavel, Scale } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/lib/translations";
import type { Chapter } from "./resources-content";

interface Props {
  chapters: Chapter[];
  language: Language;
}

export function ResourceChapters({ chapters, language }: Props) {
  const { t } = useLanguage();
  const actChapters = chapters.filter((c) => c.parent_law === "act");
  const rulesChapters = chapters.filter((c) => c.parent_law === "rules");

  return (
    <div className="space-y-10">
      {/* Labour Act */}
      <ChapterSection
        icon={Scale}
        tone="accent-blue"
        title={t("resources.chapters.labourAct")}
        subtitle={t("resources.chapters.labourActDesc")}
        chapters={actChapters}
        language={language}
        t={t}
      />

      {/* Labour Rules */}
      <ChapterSection
        icon={Gavel}
        tone="emerald"
        title={t("resources.chapters.labourRules")}
        subtitle={t("resources.chapters.labourRulesDesc")}
        chapters={rulesChapters}
        language={language}
        t={t}
      />

      {chapters.length === 0 && (
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
            {t("resources.empty.chapters")}
          </h3>
        </div>
      )}
    </div>
  );
}

/* ───────────────── Section ───────────────── */

type Tone = "accent-blue" | "emerald" | "bronze" | "rust";

function ChapterSection({
  icon: Icon,
  tone,
  title,
  subtitle,
  chapters,
  language,
  t,
}: {
  icon: typeof Scale;
  tone: Tone;
  title: string;
  subtitle: string;
  chapters: Chapter[];
  language: Language;
  t: (key: string) => string;
}) {
  if (chapters.length === 0) return null;
  const metaTone =
    tone === "accent-blue" ? "accent" : tone === "emerald" ? "emerald" : "bronze";

  return (
    <div>
      {/* Section header */}
      <div
        className="flex items-start gap-3"
        style={{
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: "1px solid var(--line-1)",
        }}
      >
        <span
          className="inline-flex items-center justify-center shrink-0"
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--r-md)",
            background: `color-mix(in oklab, var(--${tone}) 14%, transparent)`,
            border: `1px solid color-mix(in oklab, var(--${tone}) 26%, transparent)`,
            color: `var(--${tone})`,
          }}
        >
          <Icon style={{ width: 18, height: 18 }} />
        </span>
        <div className="min-w-0">
          <h3 className="lf-h3" style={{ fontSize: 18, lineHeight: 1.25 }}>
            {title}
          </h3>
          <p
            className="lf-meta"
            style={{ marginTop: 4, fontSize: 10, textTransform: "none" }}
          >
            {subtitle}
          </p>
        </div>
        <span
          className={`lf-meta lf-meta--${metaTone} shrink-0`}
          style={{ marginLeft: "auto", paddingTop: 4 }}
        >
          {String(chapters.length).padStart(2, "0")}
        </span>
      </div>

      {/* Chapter grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chapters.map((ch) => {
          const chTitle =
            language === "bn" && ch.title_bn ? ch.title_bn : ch.title;
          return (
            <Link
              key={ch.id}
              href={`/resources/chapters/${ch.id}`}
              className="lf-card lf-card--hover"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "16px 18px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div className="flex items-center justify-between">
                <span className={`lf-meta lf-meta--${metaTone}`}>
                  § Ch.{" "}
                  {ch.chapter_number.padStart
                    ? ch.chapter_number.padStart(2, "0")
                    : ch.chapter_number}
                </span>
                <BookOpen
                  style={{
                    width: 13,
                    height: 13,
                    color: "var(--ink-4)",
                  }}
                />
              </div>

              <p
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: "var(--ink)",
                  lineHeight: 1.3,
                  fontVariationSettings: '"opsz" 20',
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {chTitle}
              </p>

              <div
                className="flex items-center justify-between"
                style={{
                  marginTop: "auto",
                  paddingTop: 10,
                  borderTop: "1px solid var(--line-1)",
                  gap: 8,
                }}
              >
                {ch.sections_range ? (
                  <span className="lf-meta" style={{ fontSize: 9.5 }}>
                    §{ch.sections_range}
                  </span>
                ) : (
                  <span className="lf-meta" style={{ fontSize: 9.5 }}>
                    {t("resources.sections")}
                  </span>
                )}
                <span
                  className={`lf-meta lf-meta--${metaTone} inline-flex items-center`}
                  style={{ gap: 4, fontSize: 9.5 }}
                >
                  Read
                  <ArrowRight
                    className="lf-card-arrow"
                    style={{
                      width: 11,
                      height: 11,
                      transition:
                        "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }}
                  />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
