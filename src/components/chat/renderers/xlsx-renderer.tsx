"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, DownloadIcon, Loader2Icon, FileSpreadsheetIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface XlsxRendererProps {
  blobUrl: string;
  fileName?: string;
  onDownload?: () => void;
  language?: "en" | "bn";
}

interface Sheet {
  name: string;
  html: string;
}

/**
 * XLSX renderer — SheetJS `XLSX.read` + `sheet_to_html` for each sheet,
 * then tabs across the top let the user switch between them.
 *
 * The generated HTML uses inline styles from SheetJS; we override via
 * scoped Tailwind selectors (see `xlsx-body` class) so our tokens
 * (border-border, bg-card, etc.) dominate.
 */
export function XlsxRenderer({
  blobUrl,
  fileName,
  onDownload,
  language = "en",
}: XlsxRendererProps) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setSheets([]);
    setActiveIdx(0);

    (async () => {
      try {
        const res = await fetch(blobUrl);
        if (!res.ok) {
          throw new Error(`Fetch failed: HTTP ${res.status}`);
        }
        const buf = await res.arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const parsed: Sheet[] = wb.SheetNames.map((name) => ({
          name,
          html: XLSX.utils.sheet_to_html(wb.Sheets[name]),
        }));
        if (cancelled) return;
        setSheets(parsed);
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
      <XlsxErrorCard
        error={err}
        fileName={fileName}
        onDownload={onDownload}
        language={language}
      />
    );
  }

  if (loading) {
    return <XlsxSkeleton language={language} />;
  }

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        {language === "bn" ? "কোনো শিট নেই" : "No sheets found"}
      </div>
    );
  }

  const active = sheets[activeIdx] ?? sheets[0];

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/30">
      {/* Sheet tabs */}
      <div
        className="flex items-center gap-1 border-b border-border bg-card/60 px-3 pt-2 overflow-x-auto scrollbar-none shrink-0"
        role="tablist"
        aria-label={language === "bn" ? "শিট" : "Sheets"}
      >
        {sheets.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={`${s.name}-${i}`}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-[11px] font-medium transition-colors",
                "whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "bg-background text-foreground border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <FileSpreadsheetIcon className="size-3" />
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Sheet body — scrolls independently so tabs stay visible */}
      <div className="flex-1 min-h-0 overflow-auto bg-background">
        <div
          className="xlsx-body p-4 text-[12px] text-foreground"
          dangerouslySetInnerHTML={{ __html: active.html }}
        />
      </div>

      {/* Scoped styling — our tokens layered over SheetJS defaults */}
      <style jsx global>{`
        .xlsx-body table {
          border-collapse: collapse;
          font-family: inherit;
        }
        .xlsx-body th,
        .xlsx-body td {
          border: 1px solid var(--color-border);
          padding: 4px 8px;
          min-width: 48px;
          vertical-align: top;
          color: inherit;
        }
        .xlsx-body th {
          background: var(--color-muted);
          font-weight: 600;
        }
        .xlsx-body tr:nth-child(odd) td {
          background: color-mix(in oklab, var(--color-muted) 30%, transparent);
        }
      `}</style>
    </div>
  );
}

function XlsxSkeleton({ language }: { language: "en" | "bn" }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/30">
      <div className="flex items-center gap-2 border-b border-border bg-card/60 px-3 py-2 shrink-0 text-[10.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        {language === "bn" ? "লোড হচ্ছে..." : "Loading spreadsheet..."}
      </div>
      <div className="flex-1 p-4">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="h-5 rounded bg-muted/60"
              style={{ opacity: 1 - (i % 12) * 0.04 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function XlsxErrorCard({
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
          {language === "bn" ? "স্প্রেডশিট প্রিভিউ করা যায়নি" : "Spreadsheet preview failed"}
        </h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
          {language === "bn"
            ? "ফাইলটি ডাউনলোড করে Excel বা Google Sheets-এ খুলুন।"
            : "Download and open in Excel or Google Sheets."}
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
