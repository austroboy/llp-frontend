"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Share2,
  Bookmark,
  Printer,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

interface SearchResultContentProps {
  docId: string;
  docTitle: string;
  docType: string;
  chapter: string | null;
  sectionId: string;
  sectionTitle: string;
  sectionContent: string;
  sectionTitleBn: string | null;
  sectionContentBn: string | null;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}

const ecosystemLinks = [
  { key: "search.eco.scout", href: "/headhunting" },
  { key: "search.eco.expert", href: "/experts" },
  { key: "search.eco.resources", href: "/documents" },
  { key: "search.eco.blog", href: "/blog" },
  { key: "search.eco.talent", href: "/headhunting" },
];

export function SearchResultContent({
  docId,
  docTitle,
  docType,
  chapter,
  sectionId,
  sectionTitle,
  sectionContent,
  sectionTitleBn,
  sectionContentBn,
  prev,
  next,
}: SearchResultContentProps) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Show Bangla content when available and language is BN
  const displayTitle = language === "bn" && sectionTitleBn ? sectionTitleBn : sectionTitle;
  const displayContent = language === "bn" && sectionContentBn ? sectionContentBn : sectionContent;

  // Determine if content is long enough to need expand/collapse
  const isLongContent = displayContent.length > 800;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  function handleCopy() {
    navigator.clipboard?.writeText(window.location.href);
    showToast(t("search.toast.linkCopied"));
  }

  function handleCopyContent() {
    const el = document.getElementById("section-content");
    if (el) {
      navigator.clipboard?.writeText(el.innerText);
      showToast(t("search.toast.contentCopied"));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteTopNav />

      <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 lg:px-6">
        {/* Back link */}
        <Link
          href={`/documents/${docId}#${sectionId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="size-4" />
          {t("search.backToDoc")}
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main reading pane */}
          <div className="space-y-4 min-w-0">
            {/* Reading pane card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              {/* Header band */}
              <div className="bg-gradient-to-r from-primary to-primary/80 p-5 sm:p-6 text-primary-foreground">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <span className="inline-block rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 text-[11px] mb-2">
                      {docTitle}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {displayTitle}
                    </h1>
                    {chapter && (
                      <p className="mt-1 text-sm opacity-90">
                        {chapter} | {docType}
                      </p>
                    )}
                  </div>
                  {/* Action icons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="flex size-9 items-center justify-center rounded-full border border-white/25 hover:bg-white/15 transition-colors"
                      title="Copy link"
                    >
                      <Copy className="size-4" />
                    </button>
                    <button
                      onClick={() => showToast(t("search.toast.bookmarked"))}
                      className="flex size-9 items-center justify-center rounded-full border border-white/25 hover:bg-white/15 transition-colors"
                      title="Bookmark"
                    >
                      <Bookmark className="size-4" />
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex size-9 items-center justify-center rounded-full border border-white/25 hover:bg-white/15 transition-colors"
                      title="Print"
                    >
                      <Printer className="size-4" />
                    </button>
                    <button
                      onClick={() => showToast(t("search.toast.shared"))}
                      className="flex size-9 items-center justify-center rounded-full border border-white/25 hover:bg-white/15 transition-colors"
                      title="Share"
                    >
                      <Share2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6">
                {/* Action row */}
                <div className="flex items-center justify-end gap-2 mb-4">
                  <button
                    onClick={handleCopyContent}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/30 transition-colors"
                  >
                    {t("search.copyText")}
                  </button>
                  <Link
                    href={`/documents/${docId}#${sectionId}`}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/30 transition-colors"
                  >
                    {t("search.viewSource")}
                  </Link>
                </div>

                {/* Content */}
                <div className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 relative">
                  <div
                    id="section-content"
                    className={cn(
                      "text-[15px] leading-7 whitespace-pre-wrap",
                      !expanded && isLongContent && "line-clamp-[12]"
                    )}
                  >
                    {displayContent}
                  </div>
                  {!expanded && isLongContent && (
                    <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-muted/20 to-transparent pointer-events-none rounded-b-2xl" />
                  )}
                </div>
                {isLongContent && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    {expanded ? t("search.showLess") : t("search.readMore")}
                    <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                  </button>
                )}

                {/* Section nav */}
                {(prev || next) && (
                  <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                    {prev ? (
                      <Link
                        href={`/search/${docId}/${prev.id}`}
                        className="hover:text-foreground transition-colors truncate max-w-[45%]"
                      >
                        ← {prev.title}
                      </Link>
                    ) : (
                      <span />
                    )}
                    {next ? (
                      <Link
                        href={`/search/${docId}/${next.id}`}
                        className="hover:text-foreground transition-colors truncate max-w-[45%] text-right"
                      >
                        {next.title} →
                      </Link>
                    ) : (
                      <span />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Feedback section */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{t("search.feedback.title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("search.feedback.subtitle")}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowFlag(!showFlag); setShowComment(false); }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      showFlag ? "border-destructive/50 bg-destructive/5 text-destructive" : "border-border hover:bg-muted/30"
                    )}
                  >
                    <Flag className="size-3 inline mr-1" />
                    {t("search.feedback.flag")}
                  </button>
                  <button
                    onClick={() => { setShowComment(!showComment); setShowFlag(false); }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      showComment ? "border-primary/50 bg-primary/5 text-primary" : "border-border hover:bg-muted/30"
                    )}
                  >
                    <MessageSquare className="size-3 inline mr-1" />
                    {t("search.feedback.comment")}
                  </button>
                </div>
              </div>

              {/* Flag panel */}
              {showFlag && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <option>{t("search.flag.type")}</option>
                      <option>{t("search.flag.meaning")}</option>
                      <option>{t("search.flag.section")}</option>
                      <option>{t("search.flag.translation")}</option>
                      <option>{t("search.flag.typo")}</option>
                      <option>{t("search.flag.other")}</option>
                    </select>
                    <input
                      type="email"
                      placeholder={t("search.flag.email")}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder={t("search.flag.descPh")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowFlag(false)}>
                      {t("search.cancel")}
                    </Button>
                    <Button size="sm" className="rounded-full" onClick={() => { setShowFlag(false); showToast(t("search.toast.flagSubmitted")); }}>
                      {t("search.submit")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Comment panel */}
              {showComment && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <input
                    type="text"
                    placeholder={t("search.comment.titlePh")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={3}
                    placeholder={t("search.comment.bodyPh")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowComment(false)}>
                      {t("search.cancel")}
                    </Button>
                    <Button size="sm" className="rounded-full" onClick={() => { setShowComment(false); showToast(t("search.toast.commentSubmitted")); }}>
                      {t("search.submit")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Ecosystem links */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t("search.eco.title")}
              </h4>
              <ul className="space-y-2">
                {ecosystemLinks.map(({ key, href }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t(key)}
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notice */}
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900/50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-yellow-800 dark:text-yellow-200 mb-2">
                {t("search.notice.title")}
              </h4>
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                {t("search.notice.text")}
              </p>
            </div>

            {/* Community */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("search.community.title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("search.community.text")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 bottom-16 z-50 animate-fade-in-up rounded-2xl bg-foreground text-background px-4 py-3 shadow-xl text-sm flex items-center gap-2">
          <CheckCircle className="size-4" />
          {toast}
        </div>
      )}

      <HomepageFooter />
    </div>
  );
}
