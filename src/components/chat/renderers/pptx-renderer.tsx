"use client";

import { DownloadIcon, PresentationIcon } from "lucide-react";

interface PptxRendererProps {
  fileName?: string;
  onDownload?: () => void;
  language?: "en" | "bn";
  /**
   * Unused in the fallback renderer, but kept in the Props contract so
   * `canvas-preview.tsx` can pass a consistent prop bag to every format.
   */
  blobUrl?: string;
}

/**
 * PPTX renderer — fallback only for Phase 2. Real slide rendering is
 * out of scope; we show a friendly card that invites the user to
 * download and open in PowerPoint / Google Slides / Keynote.
 *
 * Phase 3 upgrade path: wire `pptxtojson` + `pptxjs`, or add a
 * server-side PPTX→PDF conversion and route through the PDF renderer.
 */
export function PptxRenderer({
  fileName,
  onDownload,
  language = "en",
}: PptxRendererProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 gap-3 text-center bg-muted/30">
      <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card shadow-sm">
        <PresentationIcon className="size-7 text-orange-500/80" strokeWidth={1.5} />
      </div>
      <div className="max-w-sm">
        <h3 className="text-sm font-semibold text-foreground">
          {language === "bn"
            ? "স্লাইড প্রিভিউ এখনো উপলব্ধ নয়"
            : "Slide preview not available yet"}
        </h3>
        <p className="mt-1.5 text-[11.5px] text-muted-foreground leading-relaxed">
          {language === "bn"
            ? "PPTX ফাইলগুলো এখনই ক্যানভাসে রেন্ডার করা যায় না। PowerPoint বা Google Slides-এ দেখতে ডাউনলোড করুন।"
            : "PPTX files can't be rendered inline yet. Download to view in PowerPoint or Google Slides."}
        </p>
      </div>
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <DownloadIcon className="size-3.5" />
          {language === "bn" ? "ডাউনলোড করুন" : "Download"}
          {fileName ? ` ${fileName}` : ""}
        </button>
      )}
    </div>
  );
}
