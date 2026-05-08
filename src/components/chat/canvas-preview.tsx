"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DownloadIcon,
  MaximizeIcon,
  Minimize2Icon,
  XIcon,
  FileTextIcon,
  FileIcon,
  FileSpreadsheetIcon,
  PresentationIcon,
  Loader2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWorkspaceStore,
  selectActiveFile,
  type WorkspaceFile,
  type WorkspaceFileFormat,
} from "@/store/workspace-store";
import { CanvasEmptyState } from "./canvas-empty-state";
import { DocxRenderer } from "./renderers/docx-renderer";
import { PdfRenderer } from "./renderers/pdf-renderer";
import { XlsxRenderer } from "./renderers/xlsx-renderer";
import { PptxRenderer } from "./renderers/pptx-renderer";
import { FileTypeIcon, hasFileTypeIcon } from "./file-type-icon";
import { track, type ExportFormat } from "@/lib/posthog/events";
import { useChatStore } from "@/store/chat-store";

const EXPORT_FORMATS: ReadonlySet<WorkspaceFileFormat> = new Set<WorkspaceFileFormat>([
  "docx",
  "pdf",
  "pptx",
  "xlsx",
]);

interface CanvasPreviewProps {
  language?: "en" | "bn";
}

const FORMAT_ICON: Record<WorkspaceFileFormat, React.ComponentType<{ className?: string }>> = {
  docx: FileTextIcon,
  pdf: FileIcon,
  xlsx: FileSpreadsheetIcon,
  pptx: PresentationIcon,
  png: FileIcon,
  jpg: FileIcon,
  txt: FileIcon,
};

const FORMAT_TINT: Record<WorkspaceFileFormat, string> = {
  docx: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  pdf: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  xlsx: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  pptx: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  png: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  jpg: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  txt: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

/**
 * Canvas preview — Phase 2.
 *
 * Fetches a signed URL for the active file from the workspace store
 * (which caches for 50 minutes) and routes to the right renderer by
 * format. Renderers are self-contained and handle their own loading +
 * error states.
 */
export function CanvasPreview({ language = "en" }: CanvasPreviewProps) {
  const activeFile = useWorkspaceStore(selectActiveFile);
  const clearActive = useWorkspaceStore((s) => s.clearActiveFile);
  const getSignedUrl = useWorkspaceStore((s) => s.getSignedUrl);
  const invalidateSignedUrl = useWorkspaceStore((s) => s.invalidateSignedUrl);
  const maximized = useWorkspaceStore((s) => s.canvasMaximized);
  const toggleMaximized = useWorkspaceStore((s) => s.toggleCanvasMaximized);
  const userTier = useChatStore((s) => s.userTier);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlErr, setUrlErr] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState<boolean>(false);

  const FormatIcon = useMemo(() => {
    if (!activeFile) return FileIcon;
    return FORMAT_ICON[activeFile.format] ?? FileIcon;
  }, [activeFile]);

  const activeFileId = activeFile?.id ?? null;

  // Re-fetch the signed URL whenever the active file changes.
  useEffect(() => {
    if (!activeFileId) {
      setSignedUrl(null);
      setUrlErr(null);
      setUrlLoading(false);
      return;
    }
    let cancelled = false;
    setUrlLoading(true);
    setUrlErr(null);
    setSignedUrl(null);

    getSignedUrl(activeFileId)
      .then((u) => {
        if (cancelled) return;
        setSignedUrl(u);
        setUrlLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setUrlErr(msg);
        setUrlLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFileId, getSignedUrl]);

  const handleDownload = useCallback(async () => {
    if (!activeFile) return;
    try {
      // Ensure we have a fresh signed URL, then trigger the browser
      // download via an anchor so the filename sticks.
      const url = signedUrl || (await getSignedUrl(activeFile.id));
      const a = document.createElement("a");
      a.href = url;
      a.download = activeFile.fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Dual-fire: existing chat_export_clicked + new
      // compliance_report_exported. Only fires for builder formats
      // (docx/pdf/pptx/xlsx); the canvas can also surface raw
      // png/jpg/txt previews which fall outside the analytics scope.
      if (EXPORT_FORMATS.has(activeFile.format)) {
        const exportFormat = activeFile.format as ExportFormat;
        void track("chat_export_clicked", { format: exportFormat });
        void track("compliance_report_exported", {
          file_id: activeFile.id,
          export_format: exportFormat,
          user_tier_id: userTier ?? "free_subscribed",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Force re-sign on next attempt
      invalidateSignedUrl(activeFile.id);
      // eslint-disable-next-line no-console
      console.error("[canvas] download failed:", msg);
    }
  }, [activeFile, signedUrl, getSignedUrl, invalidateSignedUrl, userTier]);

  if (!activeFile) {
    return (
      <div className="codex-canvas flex h-full flex-col">
        <CanvasHeader language={language} onClose={clearActive} empty />
        <div className="flex-1 min-h-0">
          <CanvasEmptyState language={language} />
        </div>
        <style>{canvasStyles}</style>
      </div>
    );
  }

  return (
    <div className="codex-canvas flex h-full flex-col">
      {/* Header */}
      <div className="codex-canvas-header flex items-center justify-between gap-2 px-4 h-11 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center size-7 rounded-md",
              hasFileTypeIcon(activeFile.format)
                ? "codex-canvas-icon"
                : FORMAT_TINT[activeFile.format]
            )}
          >
            {hasFileTypeIcon(activeFile.format) ? (
              <FileTypeIcon format={activeFile.format} className="size-5" />
            ) : (
              <FormatIcon className="size-3.5" />
            )}
          </span>
          <span className="codex-canvas-filename truncate text-[14px]" title={activeFile.fileName}>
            {activeFile.fileName}
          </span>
          <span className="codex-canvas-chip inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.18em]">
            {activeFile.format}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <CanvasIconButton
            icon={DownloadIcon}
            label={language === "bn" ? "ডাউনলোড" : "Download"}
            onClick={handleDownload}
          />
          <CanvasIconButton
            icon={maximized ? Minimize2Icon : MaximizeIcon}
            label={
              maximized
                ? language === "bn"
                  ? "ছোট করুন"
                  : "Exit full screen"
                : language === "bn"
                  ? "ফুল স্ক্রিন"
                  : "Full screen"
            }
            onClick={toggleMaximized}
          />
          <CanvasIconButton
            icon={XIcon}
            label={language === "bn" ? "বন্ধ করুন" : "Close preview"}
            onClick={clearActive}
          />
        </div>
      </div>

      {/* Body — renderer router */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <RendererSlot
          file={activeFile}
          signedUrl={signedUrl}
          urlErr={urlErr}
          urlLoading={urlLoading}
          language={language}
          onDownload={handleDownload}
        />
      </div>
      <style>{canvasStyles}</style>
    </div>
  );
}

const canvasStyles = `
  .codex-canvas {
    background:
      radial-gradient(120% 50% at 50% -10%, color-mix(in oklab, var(--ledger-rust) 5%, transparent), transparent 60%),
      linear-gradient(180deg, var(--ledger-bg) 0%, var(--ledger-bg-deep) 100%);
    color: var(--ledger-ink);
    font-family: var(--font-inter), system-ui, sans-serif;
  }
  .codex-canvas-header {
    border-bottom: 1px solid var(--ledger-rule);
    background: color-mix(in oklab, var(--ledger-ink) 2%, transparent);
    backdrop-filter: blur(6px);
  }
  .codex-canvas-icon {
    background: var(--ledger-frame);
    border: 1px solid var(--ledger-rule);
  }
  .codex-canvas-filename {
    font-family: var(--font-fraunces), var(--font-lora), serif;
    font-weight: 500;
    color: var(--ledger-ink);
  }
  .codex-canvas-chip {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    color: var(--ledger-rust);
    background: color-mix(in oklab, var(--ledger-rust) 12%, transparent);
    border: 1px solid color-mix(in oklab, var(--ledger-rust) 22%, transparent);
  }
  .codex-canvas-ibtn {
    color: var(--ledger-ink-muted);
    background: transparent;
    border-radius: 8px;
    transition: color 160ms ease, background 160ms ease;
  }
  .codex-canvas-ibtn:hover {
    color: var(--ledger-ink);
    background: var(--ledger-hover);
  }
`;

function RendererSlot({
  file,
  signedUrl,
  urlErr,
  urlLoading,
  language,
  onDownload,
}: {
  file: WorkspaceFile;
  signedUrl: string | null;
  urlErr: string | null;
  urlLoading: boolean;
  language: "en" | "bn";
  onDownload: () => void;
}) {
  // URL error path — show a graceful recover card regardless of format.
  if (urlErr) {
    return (
      <UrlErrorCard
        error={urlErr}
        fileName={file.fileName}
        onDownload={onDownload}
        language={language}
      />
    );
  }
  if (urlLoading || !signedUrl) {
    return <UrlLoadingCard language={language} />;
  }

  switch (file.format) {
    case "docx":
      return (
        <div className="h-full min-h-0 overflow-auto bg-muted/30">
          <DocxRenderer
            blobUrl={signedUrl}
            fileName={file.fileName}
            onDownload={onDownload}
            language={language}
          />
        </div>
      );
    case "pdf":
      return (
        <PdfRenderer
          blobUrl={signedUrl}
          fileName={file.fileName}
          onDownload={onDownload}
          language={language}
        />
      );
    case "xlsx":
      return (
        <XlsxRenderer
          blobUrl={signedUrl}
          fileName={file.fileName}
          onDownload={onDownload}
          language={language}
        />
      );
    case "pptx":
      return (
        <PptxRenderer
          fileName={file.fileName}
          onDownload={onDownload}
          language={language}
        />
      );
    default:
      return (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm text-muted-foreground">
              {language === "bn"
                ? `অসমর্থিত ফরম্যাট: ${file.format}`
                : `Unsupported format: ${file.format}`}
            </p>
            <button
              type="button"
              onClick={onDownload}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold transition-colors"
            >
              <DownloadIcon className="size-3.5" />
              {language === "bn" ? "ডাউনলোড" : "Download"}
            </button>
          </div>
        </div>
      );
  }
}

function UrlLoadingCard({ language }: { language: "en" | "bn" }) {
  return (
    <div className="flex h-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
        <span className="text-[11px]">
          {language === "bn" ? "ফাইল লোড হচ্ছে..." : "Preparing preview..."}
        </span>
      </div>
    </div>
  );
}

function UrlErrorCard({
  error,
  fileName,
  onDownload,
  language,
}: {
  error: string;
  fileName: string;
  onDownload: () => void;
  language: "en" | "bn";
}) {
  return (
    <div className="flex h-full items-center justify-center p-6 bg-muted/20">
      <div className="max-w-md w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangleIcon className="size-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {language === "bn" ? "ফাইল লোড করা যায়নি" : "Couldn't load this file"}
        </h3>
        <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
          {language === "bn"
            ? "সাইন করা URL তৈরি করতে ব্যর্থ। ডাউনলোড করে দেখুন।"
            : "The signed URL could not be generated. Try downloading instead."}
        </p>
        <p className="mt-2 text-[10.5px] text-muted-foreground/70 font-mono break-all">
          {error.slice(0, 160)}
        </p>
        <button
          type="button"
          onClick={onDownload}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold transition-colors"
        >
          <DownloadIcon className="size-3.5" />
          {language === "bn" ? "ডাউনলোড" : "Download"} {fileName}
        </button>
      </div>
    </div>
  );
}

/** Minimal header used when the canvas is empty (no file). */
function CanvasHeader({
  language,
  onClose,
  empty,
}: {
  language: "en" | "bn";
  onClose: () => void;
  empty?: boolean;
}) {
  return (
    <div className="codex-canvas-header flex items-center justify-between gap-2 px-4 h-11 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0 flex-1 text-[10px] uppercase tracking-[0.28em]">
        <span className="codex-canvas-section">&sect;</span>
        <span className="codex-canvas-label">
          {language === "bn" ? "ক্যানভাস" : "Canvas"}
        </span>
        {empty && (
          <span className="codex-canvas-meta truncate normal-case tracking-normal text-[11px] italic">
            &mdash; {language === "bn" ? "কোনো ফাইল নেই" : "no file filed"}
          </span>
        )}
      </div>
      <CanvasIconButton
        icon={XIcon}
        label={language === "bn" ? "বন্ধ করুন" : "Close preview"}
        onClick={onClose}
      />
      <style>{`
        .codex-canvas-section { font-family: var(--font-jetbrains), ui-monospace, monospace; color: var(--ledger-rust); }
        .codex-canvas-label { font-family: var(--font-jetbrains), ui-monospace, monospace; color: var(--ledger-ink-muted); }
        .codex-canvas-meta { font-family: var(--font-fraunces), var(--font-lora), serif; color: var(--ledger-ink-faint); }
      `}</style>
    </div>
  );
}

function CanvasIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="codex-canvas-ibtn inline-flex items-center justify-center size-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ledger-rust)]"
    >
      <Icon className="size-3.5" />
    </button>
  );
}
