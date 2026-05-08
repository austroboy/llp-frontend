"use client";

import { useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/lib/translations";

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

interface Props {
  categories: Category[];
  files: ResourceFile[];
  language: Language;
}

export function ResourceDownloads({ categories, files, language }: Props) {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredCategories = activeCategory
    ? categories.filter((c) => c.slug === activeCategory)
    : categories;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Category sidebar — pill chip rail (mobile horizontal, desktop column) */}
      <aside className="w-full shrink-0 lg:w-64">
        <nav className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          <CategoryPill
            label={t("resources.allCategories")}
            count={files.length}
            active={!activeCategory}
            onClick={() => setActiveCategory(null)}
          />
          {categories.map((cat) => {
            const count = files.filter((f) => f.category_id === cat.id).length;
            const catName =
              language === "bn" && cat.name_bn ? cat.name_bn : cat.name;
            return (
              <CategoryPill
                key={cat.slug}
                label={catName}
                count={count}
                active={activeCategory === cat.slug}
                onClick={() =>
                  setActiveCategory(
                    activeCategory === cat.slug ? null : cat.slug
                  )
                }
              />
            );
          })}
        </nav>
      </aside>

      {/* Category file lists */}
      <div className="min-w-0 flex-1 space-y-8">
        {filteredCategories.map((cat) => {
          const catFiles = files.filter((f) => f.category_id === cat.id);
          if (catFiles.length === 0) return null;
          const catName =
            language === "bn" && cat.name_bn ? cat.name_bn : cat.name;

          return (
            <div key={cat.slug}>
              {/* Category header */}
              <div
                className="flex items-center justify-between"
                style={{
                  marginBottom: 14,
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--line-1)",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="lf-meta lf-meta--accent">§</span>
                  <h3
                    className="lf-h3 truncate"
                    style={{ fontSize: 18, lineHeight: 1.25 }}
                  >
                    {catName}
                  </h3>
                </div>
                <span
                  className="lf-tag lf-tag--more shrink-0"
                  style={{ marginLeft: 12 }}
                >
                  {String(catFiles.length).padStart(2, "0")}
                </span>
              </div>

              {/* File rows */}
              <div className="space-y-2">
                {catFiles.map((file) => {
                  const title =
                    language === "bn" && file.title_bn
                      ? file.title_bn
                      : file.title;
                  const isEn = file.language === "en";
                  return (
                    <div
                      key={file.id}
                      className="lf-card lf-card--hover flex items-center gap-3 sm:gap-4"
                      style={{ padding: "14px 16px" }}
                    >
                      {/* Doc icon plate */}
                      <div
                        className="shrink-0 inline-flex items-center justify-center"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "var(--r-md)",
                          background:
                            "color-mix(in oklab, var(--rust) 12%, transparent)",
                          border:
                            "1px solid color-mix(in oklab, var(--rust) 24%, transparent)",
                          color: "var(--rust)",
                        }}
                      >
                        <FileText style={{ width: 18, height: 18 }} />
                      </div>

                      {/* Title + meta */}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate"
                          style={{
                            fontFamily: "var(--lf-display)",
                            fontSize: 15,
                            fontWeight: 500,
                            color: "var(--ink)",
                            lineHeight: 1.3,
                            fontVariationSettings: '"opsz" 24',
                          }}
                        >
                          {title}
                        </p>
                        <div
                          className="flex items-center gap-2 flex-wrap"
                          style={{ marginTop: 4 }}
                        >
                          <span
                            className={`lf-tag ${
                              isEn ? "lf-tag--skill" : "lf-tag--sector"
                            }`}
                            style={{ fontSize: 9.5 }}
                          >
                            {isEn ? "EN" : "BN"}
                          </span>
                          {file.file_size_display && (
                            <span className="lf-meta" style={{ fontSize: 9.5 }}>
                              {file.file_size_display}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions — desktop full pills, mobile icon-only */}
                      {file.public_url && (
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Desktop: View + Download as ghost pills */}
                          <a
                            href={file.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lf-cta lf-cta--ghost lf-glow hidden sm:inline-flex"
                            title={t("resources.view")}
                          >
                            <Eye style={{ width: 13, height: 13 }} />
                            {t("resources.view")}
                          </a>
                          <a
                            href={file.public_url}
                            download={file.file_name}
                            className="lf-cta lf-cta--primary lf-glow hidden sm:inline-flex"
                            title={t("resources.download")}
                          >
                            <Download style={{ width: 13, height: 13 }} />
                            {t("resources.download")}
                          </a>

                          {/* Mobile: single icon button */}
                          <a
                            href={file.public_url}
                            download={file.file_name}
                            className="lf-icon-btn sm:hidden"
                            title={t("resources.download")}
                            aria-label={t("resources.download")}
                          >
                            <Download style={{ width: 14, height: 14 }} />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {files.length === 0 && (
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
              {t("resources.empty.files")}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Sidebar pill ───────────────── */

function CategoryPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "lf-cta lf-cta--primary lf-glow" : "lf-cta lf-cta--ghost lf-glow"}
      style={{
        justifyContent: "space-between",
        textAlign: "left",
        whiteSpace: "nowrap",
        gap: 12,
      }}
    >
      <span className="truncate">{label}</span>
      <span
        style={{
          fontFamily: "var(--lf-mono)",
          fontSize: 10,
          fontWeight: 600,
          opacity: 0.75,
          letterSpacing: "0.08em",
        }}
      >
        {String(count).padStart(2, "0")}
      </span>
    </button>
  );
}
