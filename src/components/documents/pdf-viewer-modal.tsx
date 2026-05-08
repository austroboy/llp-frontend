"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  AlertCircle,
  Globe,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/lib/translations";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker (served locally from public/)
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  title: string;
  pdfLangs?: { en: boolean; bn: boolean };
}

export function PdfViewerModal({
  open,
  onOpenChange,
  docId,
  title,
  pdfLangs,
}: PdfViewerModalProps) {
  const { language } = useLanguage();
  const [pdfLang, setPdfLang] = useState<Language>(language);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with global language when modal opens
  useEffect(() => {
    if (open) setPdfLang(language);
  }, [open, language]);

  const hasBothLangs = pdfLangs?.en && pdfLangs?.bn;
  const pdfUrl = `/api/pdf/${docId}?lang=${pdfLang}`;

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPageNumber(1);
      setLoading(false);
      setError(null);
    },
    []
  );

  const onDocumentLoadError = useCallback(() => {
    setLoading(false);
    setError("Failed to load PDF");
  }, []);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastTouchDistRef = useRef<number | null>(null);
  const isScrollingToPage = useRef(false);

  const clampScale = (s: number) => Math.min(3, Math.max(0.3, s));
  const zoomIn = () => setScale((s) => clampScale(s + 0.2));
  const zoomOut = () => setScale((s) => clampScale(s - 0.2));

  const scrollToPage = (page: number) => {
    const el = pageRefs.current.get(page);
    if (el && pdfContainerRef.current) {
      isScrollingToPage.current = true;
      setPageNumber(page);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { isScrollingToPage.current = false; }, 500);
    }
  };

  const goToPrevPage = () => { if (pageNumber > 1) scrollToPage(pageNumber - 1); };
  const goToNextPage = () => { if (pageNumber < numPages) scrollToPage(pageNumber + 1); };

  // Track which page is visible via IntersectionObserver
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
      { root: container, rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, scale]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${title}.pdf`;
    a.click();
  };

  // Ctrl+Wheel zoom (desktop) — only inside the PDF area
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => clampScale(s + delta));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Pinch-to-zoom (mobile/trackpad) — only inside the PDF area
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    const getTouchDistance = (touches: TouchList) => {
      if (touches.length < 2) return null;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastTouchDistRef.current = getTouchDistance(e.touches);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || lastTouchDistRef.current === null) return;
      e.preventDefault();
      const dist = getTouchDistance(e.touches);
      if (dist === null) return;
      const delta = (dist - lastTouchDistRef.current) * 0.005;
      lastTouchDistRef.current = dist;
      setScale((s) => clampScale(s + delta));
    };

    const handleTouchEnd = () => {
      lastTouchDistRef.current = null;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[900px] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-sm font-medium truncate">
              {title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="shrink-0 gap-1.5 text-xs"
            >
              <Download className="size-3.5" />
              Download
            </Button>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-border bg-muted/30 shrink-0">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= numPages) scrollToPage(val);
              }}
              className="w-12 text-center text-sm bg-background border border-border rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-muted-foreground">/ {numPages || "—"}</span>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="size-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button variant="outline" size="icon-sm" onClick={zoomOut} disabled={scale <= 0.3}>
            <ZoomOut className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="icon-sm" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="size-4" />
          </Button>

          {hasBothLangs && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => { setPdfLang("en"); setPageNumber(1); setLoading(true); }}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    pdfLang === "en"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  EN
                </button>
                <div className="w-px h-4 bg-border" />
                <button
                  onClick={() => { setPdfLang("bn"); setPageNumber(1); setLoading(true); }}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    pdfLang === "bn"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  BN
                </button>
              </div>
            </>
          )}
        </div>

        {/* PDF Content — zoom-scoped area */}
        <div
          ref={pdfContainerRef}
          className="flex-1 overflow-auto bg-muted/20 flex justify-center touch-none"
          style={{ touchAction: "pan-x pan-y" }}
        >
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <AlertCircle className="size-10 text-destructive/60" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}
