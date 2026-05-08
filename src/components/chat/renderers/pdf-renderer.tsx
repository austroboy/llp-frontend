"use client";

import { useRef, useState } from "react";
import { AlertTriangleIcon, DownloadIcon, Loader2Icon } from "lucide-react";

/**
 * PDF renderer — uses the browser's native PDF viewer via `<iframe>`.
 *
 * Why not @react-pdf-viewer/core? It peer-depends on pdfjs-dist 2.16/3.0,
 * but we have 5.6.205 pulled by other deps — peer mismatch produces
 * opaque "Unknown PDF error" at runtime even though the pdf bytes are
 * valid. The native browser viewer has no version dance, ships with
 * zoom/scroll/search out of the box, and works on Chrome/Edge/Firefox.
 * Safari also renders inline PDFs in an iframe (mobile Safari has
 * quirks but we accept those for now — user can download).
 *
 * If the iframe fails to load (network blip, signed URL 403, unsupported
 * browser), we surface a Download fallback card.
 */

interface PdfRendererProps {
  blobUrl: string;
  fileName?: string;
  onDownload?: () => void;
  language?: "en" | "bn";
}

export function PdfRenderer({
  blobUrl,
  fileName,
  onDownload,
  language = "en",
}: PdfRendererProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (status === "error") {
    return (
      <PdfErrorCard
        error={errorMsg}
        fileName={fileName}
        onDownload={onDownload}
        language={language}
      />
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-muted/30">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
            <span className="text-[11px]">
              {language === "bn" ? "PDF লোড হচ্ছে..." : "Loading PDF..."}
            </span>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={`${blobUrl}#toolbar=1&navpanes=0`}
        title={fileName ?? "PDF preview"}
        className="h-full w-full border-0"
        onLoad={() => setStatus("ready")}
        onError={() => {
          setErrorMsg(
            language === "bn"
              ? "ব্রাউজার PDF রেন্ডার করতে পারেনি।"
              : "Browser failed to render PDF."
          );
          setStatus("error");
        }}
      />
    </div>
  );
}

function PdfErrorCard({
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
          {language === "bn" ? "PDF প্রিভিউ করা যাচ্ছে না" : "PDF preview failed"}
        </h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
          {language === "bn"
            ? "ফাইলটি ডাউনলোড করে নেটিভ রিডারে খুলুন।"
            : "Download the file and open it in a native PDF reader."}
        </p>
        {error && (
          <p className="mt-2 text-[10.5px] text-muted-foreground/70 font-mono break-all">
            {error.slice(0, 160)}
          </p>
        )}
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
