"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle,
  Info,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { track } from "@/lib/posthog/events";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type EditLang = "en" | "bn";

interface ScrollTarget {
  position?: "start" | "end";
  ratio?: number;
}

interface RagPdfPanelProps {
  docId: string;
  pdfLang: EditLang;
  onPdfLangChange: (lang: EditLang) => void;
  /** Text for the requested pdfLang — shown when no PDF exists */
  fallbackText?: string | null;
  /** Whether the fallback text is an AI translation */
  fallbackIsTranslated?: boolean;
  /** Notifies parent whether a real PDF is available for the current lang */
  onPdfStatus?: (available: boolean) => void;
  /** Scroll to a specific location (from audit finding review) */
  scrollTo?: ScrollTarget | null;
  /** Called after scroll has been handled */
  onScrollHandled?: () => void;
}

export default function RagPdfPanel({
  docId,
  pdfLang,
  onPdfLangChange,
  fallbackText,
  fallbackIsTranslated,
  onPdfStatus,
  scrollTo,
  onScrollHandled,
}: RagPdfPanelProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.9);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [noPdf, setNoPdf] = useState(false);
  const [pdfChecked, setPdfChecked] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isScrollingToPage = useRef(false);

  // Use the admin proxy endpoint — it handles both legacy filesystem PDFs
  // and new documents stored in Supabase Storage.
  const pdfUrl = `/api/admin/rag/${docId}/pdf?lang=${pdfLang}`;

  // Check if requested lang has a real PDF or is a fallback. Block
  // <Document> render until HEAD resolves so we don't fire a doomed GET.
  useEffect(() => {
    setPdfChecked(false);
    setNoPdf(false);
    setPdfError(null);
    onPdfStatus?.(true);
    fetch(pdfUrl, { method: "HEAD" }).then((res) => {
      const isFallback = !res.ok || res.headers.get("X-PDF-Fallback") === "true";
      setNoPdf(isFallback);
      onPdfStatus?.(!isFallback);
    }).catch(() => {
      setNoPdf(true);
      onPdfStatus?.(false);
    }).finally(() => {
      setPdfChecked(true);
    });
  }, [pdfUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const clampScale = (s: number) => Math.min(3, Math.max(0.3, s));
  const zoomIn = () => setScale((s) => clampScale(s + 0.15));
  const zoomOut = () => setScale((s) => clampScale(s - 0.15));

  const scrollToPage = (page: number) => {
    const el = pageRefs.current.get(page);
    if (el && pdfContainerRef.current) {
      isScrollingToPage.current = true;
      setPageNumber(page);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      void track("doc_viewed", { doc_id: docId, page });
      setTimeout(() => {
        isScrollingToPage.current = false;
      }, 500);
    }
  };

  // Reset on language change
  useEffect(() => {
    setPageNumber(1);
    setPdfLoading(true);
    setPdfError(null);
  }, [pdfLang]);

  // PostHog: doc_viewed on mount / when docId changes
  useEffect(() => {
    void track("doc_viewed", { doc_id: docId, page: 1 });
  }, [docId]);

  // IntersectionObserver for page tracking
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container || numPages === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToPage.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const page = Number(entry.target.getAttribute("data-page"));
            if (page) setPageNumber(page);
          }
        }
      },
      { root: container, rootMargin: "-30% 0px -30% 0px", threshold: 0 }
    );
    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, scale]);

  // Handle scroll-to requests from audit findings
  const fallbackTextRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (!scrollTo) return;

    if (noPdf) {
      // Scroll the fallback text container
      const el = fallbackTextRef.current?.parentElement;
      if (el) {
        if (scrollTo.position === "end" || (scrollTo.ratio && scrollTo.ratio > 0.9)) {
          el.scrollTop = el.scrollHeight;
        } else if (scrollTo.position === "start") {
          el.scrollTop = 0;
        } else if (scrollTo.ratio != null) {
          el.scrollTop = scrollTo.ratio * el.scrollHeight;
        }
      }
    } else if (numPages > 0) {
      // Scroll the PDF viewer
      let targetPage = 1;
      if (scrollTo.position === "end") {
        targetPage = numPages;
      } else if (scrollTo.position === "start") {
        targetPage = 1;
      } else if (scrollTo.ratio != null) {
        targetPage = Math.max(1, Math.min(numPages, Math.round(scrollTo.ratio * numPages)));
      }
      scrollToPage(targetPage);
    }

    onScrollHandled?.();
  }, [scrollTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Text comparison view (no PDF available) ──
  if (noPdf && fallbackText) {
    const langLabel = pdfLang.toUpperCase();
    return (
      <div className="w-1/2 border-l border-border flex flex-col bg-muted/20">
        {/* Toolbar — language toggle only */}
        <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => onPdfLangChange("en")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors",
                pdfLang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              EN
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => onPdfLangChange("bn")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors",
                pdfLang === "bn"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              BN
            </button>
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
            <FileText className="size-2.5" />
            {langLabel} Text
          </Badge>
          {fallbackIsTranslated && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
              AI Translated
            </Badge>
          )}
        </div>

        {/* Info banner */}
        <div className="px-3 py-2 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 shrink-0">
          <Info className="size-3.5 shrink-0" />
          <span>
            No {langLabel} PDF available.
            Showing {langLabel} {fallbackIsTranslated ? "translated" : ""} text for side-by-side comparison.
          </span>
        </div>

        {/* Text (read-only) */}
        <div className="flex-1 overflow-auto">
          <pre
            ref={fallbackTextRef}
            className="p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap text-foreground/90"
            dir={pdfLang === "bn" ? "auto" : "ltr"}
          >
            {fallbackText}
          </pre>
        </div>
      </div>
    );
  }

  // ── No PDF and no text ──
  if (noPdf) {
    return (
      <div className="w-1/2 border-l border-border flex flex-col bg-muted/20">
        <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => onPdfLangChange("en")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors",
                pdfLang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              EN
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => onPdfLangChange("bn")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors",
                pdfLang === "bn"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              BN
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <AlertCircle className="size-10 opacity-40" />
          <p className="text-sm">No PDF or source text available for {pdfLang.toUpperCase()}</p>
        </div>
      </div>
    );
  }

  // ── PDF viewer (normal mode) ──
  return (
    <div className="w-1/2 border-l border-border flex flex-col bg-muted/20">
      {/* PDF toolbar */}
      <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        {/* Language toggle */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => onPdfLangChange("en")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium transition-colors",
              pdfLang === "en"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            EN
          </button>
          <div className="w-px h-4 bg-border" />
          <button
            onClick={() => onPdfLangChange("bn")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium transition-colors",
              pdfLang === "bn"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            BN
          </button>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Navigation */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => {
            if (pageNumber > 1) scrollToPage(pageNumber - 1);
          }}
          disabled={pageNumber <= 1}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-1 text-xs min-w-0">
          <input
            type="number"
            min={1}
            max={numPages || 1}
            value={pageNumber}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 1 && val <= numPages) scrollToPage(val);
            }}
            className="w-10 text-center text-xs bg-background border border-border rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-muted-foreground">/ {numPages || "—"}</span>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => {
            if (pageNumber < numPages) scrollToPage(pageNumber + 1);
          }}
          disabled={pageNumber >= numPages}
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Zoom */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={zoomOut}
          disabled={scale <= 0.3}
        >
          <ZoomOut className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={zoomIn}
          disabled={scale >= 3}
        >
          <ZoomIn className="size-4" />
        </Button>
      </div>

      {/* PDF content */}
      <div
        ref={pdfContainerRef}
        className="flex-1 overflow-auto flex justify-center"
      >
        {!pdfChecked ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-20">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Checking PDF…</span>
          </div>
        ) : pdfError ? (
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-20">
            <AlertCircle className="size-10 text-destructive/60" />
            <p className="text-sm">{pdfError}</p>
          </div>
        ) : noPdf ? (
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground py-20 px-6 text-center max-w-2xl">
            <FileText className="size-10 opacity-40" />
            <p className="text-sm">
              No {pdfLang === "en" ? "English" : "Bangla"} PDF on file for this document.
              {fallbackText ? " Showing extracted text below." : ""}
            </p>
            {fallbackText ? (
              <div className="w-full text-left text-xs whitespace-pre-wrap font-mono bg-muted/30 border border-border rounded p-4 max-h-[60vh] overflow-auto">
                {fallbackIsTranslated ? (
                  <Badge variant="secondary" className="mb-3 text-[10px]">
                    AI translation
                  </Badge>
                ) : null}
                {fallbackText}
              </div>
            ) : null}
          </div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setPageNumber(1);
              setPdfLoading(false);
              setPdfError(null);
            }}
            onLoadError={() => {
              setPdfLoading(false);
              setPdfError("Failed to load PDF");
            }}
            loading={
              <div className="flex items-center justify-center h-full gap-2 text-muted-foreground py-20">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Loading PDF...</span>
              </div>
            }
            className="py-4 flex flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i + 1}
                data-page={i + 1}
                ref={(el) => {
                  if (el) pageRefs.current.set(i + 1, el);
                  else pageRefs.current.delete(i + 1);
                }}
              >
                <Page
                  pageNumber={i + 1}
                  scale={scale}
                  loading={
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  }
                  className="shadow-lg [&>canvas]:!mx-auto"
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
