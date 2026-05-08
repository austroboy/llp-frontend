"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, DownloadIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocxRendererProps {
  blobUrl: string;
  fileName?: string;
  onDownload?: () => void;
  language?: "en" | "bn";
}

/**
 * DOCX renderer — fetches the blob, converts via mammoth.js, drops the
 * resulting HTML into a `prose` container on a paper-like white card.
 *
 * Mammoth output comes from a trusted server pipeline (our filegen agent),
 * so dangerouslySetInnerHTML is acceptable here. If we ever accept DOCX
 * from untrusted sources, sanitize with DOMPurify before injection.
 */
export function DocxRenderer({
  blobUrl,
  fileName,
  onDownload,
  language = "en",
}: DocxRendererProps) {
  const [html, setHtml] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setHtml("");

    (async () => {
      try {
        const res = await fetch(blobUrl);
        if (!res.ok) {
          throw new Error(`Fetch failed: HTTP ${res.status}`);
        }
        const buf = await res.arrayBuffer();
        // Dynamic import — mammoth uses xmldom which doesn't love SSR.
        const mammoth = (await import("mammoth")).default;
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        if (cancelled) return;
        setHtml(result.value || "");
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blobUrl]);

  if (err) {
    return (
      <DocxErrorCard
        error={err}
        fileName={fileName}
        onDownload={onDownload}
        language={language}
      />
    );
  }

  if (loading) {
    return <DocxSkeleton language={language} />;
  }

  return (
    <div className="mx-auto max-w-[820px] my-6 px-6">
      <div className="relative rounded-xl border border-border bg-white text-slate-900 shadow-lg shadow-black/5 overflow-hidden">
        {/* Paper top band — keeps the feel consistent with the empty state / placeholder shell */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-80" />
        <div
          className={cn(
            "prose prose-sm max-w-none",
            // Force readable color on white card even in dark mode
            "prose-headings:text-slate-900 prose-p:text-slate-800 prose-li:text-slate-800",
            "prose-strong:text-slate-900 prose-a:text-sky-700",
            "p-8 md:p-10"
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

function DocxSkeleton({ language }: { language: "en" | "bn" }) {
  return (
    <div className="mx-auto max-w-[820px] my-6 px-6">
      <div className="relative rounded-xl border border-border bg-white dark:bg-slate-50 text-slate-900 shadow-lg shadow-black/5 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-40" />
        <div className="p-8 md:p-10">
          <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
            <Loader2Icon className="size-3.5 animate-spin" />
            {language === "bn" ? "লোড হচ্ছে..." : "Loading document..."}
          </div>
          <div className="space-y-3">
            <div className="h-5 rounded bg-slate-200 w-2/3" />
            <div className="h-3 rounded bg-slate-100 w-1/2" />
            <div className="h-3" />
            <div className="h-3 rounded bg-slate-200 w-full" />
            <div className="h-3 rounded bg-slate-200 w-[95%]" />
            <div className="h-3 rounded bg-slate-200 w-[90%]" />
            <div className="h-3 rounded bg-slate-200 w-3/4" />
            <div className="h-3" />
            <div className="h-3 rounded bg-slate-200 w-full" />
            <div className="h-3 rounded bg-slate-200 w-[92%]" />
            <div className="h-3 rounded bg-slate-200 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DocxErrorCard({
  error,
  fileName,
  onDownload,
  language,
}: {
  error: string;
  fileName?: string;
  onDownload?: () => void;
  language: "en" | "bn";
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangleIcon className="size-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {language === "bn" ? "প্রিভিউ করা যাচ্ছে না" : "Preview unavailable"}
        </h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
          {language === "bn"
            ? "এই DOCX ফাইলটি ব্রাউজারে প্রিভিউ করা যায়নি। ডাউনলোড করে Word-এ খুলে দেখুন।"
            : "This DOCX file could not be rendered in the browser. Download to open in Word."}
        </p>
        <p className="mt-2 text-[10.5px] text-muted-foreground/70 font-mono break-all">
          {error.slice(0, 160)}
        </p>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold transition-colors"
          >
            <DownloadIcon className="size-3.5" />
            {language === "bn" ? "ডাউনলোড" : "Download"}
            {fileName ? ` ${fileName}` : ""}
          </button>
        )}
      </div>
    </div>
  );
}
