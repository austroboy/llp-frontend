"use client";

// DB-07c canvas surface — modal dialog variant.
// Driven by workspace-store.canvasJobId instead of a URL param so it
// opens as an overlay on /chat rather than a full-screen route.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileIcon,
  Loader2Icon,
  MinusIcon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import type {
  ResponseSchema,
  ResponseSchemaFormat,
} from "@/lib/documents/response-schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DocumentCanvas = dynamic(
  () => import("@/components/chat/canvas/DocumentCanvas"),
  { ssr: false },
);

const ALL_FORMATS: ResponseSchemaFormat[] = ["docx", "pdf", "xlsx"];

const FORMAT_ICON: Partial<Record<ResponseSchemaFormat, typeof FileTextIcon>> = {
  docx: FileTextIcon,
  pdf: FileIcon,
  xlsx: FileSpreadsheetIcon,
};

function iconFor(format: ResponseSchemaFormat) {
  return FORMAT_ICON[format] ?? FileIcon;
}

interface EmitProgressEntry {
  format: ResponseSchemaFormat;
  status: "pending" | "running" | "ok" | "fail";
  error?: string;
}

interface EmittedFileLink {
  format: ResponseSchemaFormat;
  fileName: string;
  blobUrl: string;
  sizeBytes: number;
  durationMs: number;
  warnings: string[];
  emittedAt: number;
}

export function DocumentCanvasDialog() {
  const jobId = useWorkspaceStore((s) => s.canvasJobId);
  const closeCanvas = useWorkspaceStore((s) => s.closeCanvas);
  const open = jobId !== null;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) closeCanvas();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-150",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 flex translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden",
            "h-[90vh] w-[95vw] max-w-5xl rounded-xl border border-border/60 bg-background shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-150",
          )}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            Document canvas
          </DialogPrimitive.Title>
          {jobId ? <CanvasBody jobId={jobId} /> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CanvasBody({ jobId }: { jobId: string }) {
  const job = useWorkspaceStore((s) =>
    s.generatingJobs.find((j) => j.id === jobId) ?? null,
  );
  const startEditing = useWorkspaceStore((s) => s.startEditing);
  const saveEditedJson = useWorkspaceStore((s) => s.saveEditedJson);
  const startEmit = useWorkspaceStore((s) => s.startEmit);
  const recordEmit = useWorkspaceStore((s) => s.recordEmit);
  const failEmit = useWorkspaceStore((s) => s.failEmit);
  const regenerateJob = useWorkspaceStore((s) => s.regenerateJob);
  const dismissJob = useWorkspaceStore((s) => s.dismissJob);
  const closeCanvas = useWorkspaceStore((s) => s.closeCanvas);
  const addFile = useWorkspaceStore((s) => s.addFile);

  const [selectedFormats, setSelectedFormats] = useState<
    Set<ResponseSchemaFormat>
  >(new Set());
  const [formatsHydrated, setFormatsHydrated] = useState(false);
  const [emitInFlight, setEmitInFlight] = useState(false);
  const [emitProgress, setEmitProgress] = useState<EmitProgressEntry[]>([]);
  const [emittedLinks, setEmittedLinks] = useState<EmittedFileLink[]>([]);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const sheetAnchorsRef = useRef<Array<HTMLAnchorElement | null>>([]);

  const draft = job?.editedJson ?? job?.draft;
  const sheetCount = draft?.format === "xlsx" ? draft?.sheets?.length ?? 0 : 0;

  useEffect(() => {
    if (!formatsHydrated && draft?.format) {
      setSelectedFormats(new Set([draft.format]));
      setFormatsHydrated(true);
    }
  }, [draft?.format, formatsHydrated]);

  useEffect(() => {
    if (job?.state === "draft_ready") startEditing(jobId);
  }, [jobId, job?.state, startEditing]);

  useEffect(() => {
    const links = emittedLinks;
    return () => {
      for (const l of links) {
        if (l.blobUrl) URL.revokeObjectURL(l.blobUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (next: ResponseSchema) => {
      saveEditedJson(jobId, next);
    },
    [jobId, saveEditedJson],
  );

  const validationErrors = useMemo(
    () => (draft ? validateRequired(draft) : ["no_draft"]),
    [draft],
  );

  const canApprove =
    !!draft && validationErrors.length === 0 && selectedFormats.size > 0 && !emitInFlight;

  const handleEmit = useCallback(async () => {
    if (!draft || !canApprove) return;
    setEmitInFlight(true);
    startEmit(jobId);
    const formats = Array.from(selectedFormats);
    setEmitProgress(formats.map((f) => ({ format: f, status: "pending" })));

    for (let i = 0; i < formats.length; i++) {
      const f = formats[i];
      setEmitProgress((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: "running" } : p)),
      );
      try {
        const res = await fetch("/api/chat/document/emit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, editedJson: draft, format: f }),
        });
        if (!res.ok) {
          let errMsg = `HTTP ${res.status}`;
          try {
            const body = (await res.json()) as { error?: string; message?: string };
            errMsg = body.message || body.error || errMsg;
          } catch {
            /* ignore */
          }
          setEmitProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, status: "fail", error: errMsg } : p,
            ),
          );
          failEmit(jobId, errMsg);
          continue;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const cd = res.headers.get("Content-Disposition") ?? "";
        const m = cd.match(/filename="?([^";]+)"?/);
        const fileName = m?.[1] ?? `document.${f}`;
        const sizeBytes = Number(res.headers.get("Content-Length")) || blob.size;
        const durationMs = Number(res.headers.get("X-Emit-Duration-Ms")) || 0;
        let warnings: string[] = [];
        try {
          const raw = res.headers.get("X-Emit-Warnings");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed))
              warnings = parsed.filter((w): w is string => typeof w === "string");
          }
        } catch {
          /* ignore */
        }

        // If the emit route persisted the file to generated_files,
        // mirror it into workspace-store.files so the sidebar shows
        // it right away (without waiting for the next /api/files/list
        // hydration). draftJson is carried so the "Edit" kebab can
        // rehydrate this file into the canvas later.
        const persistedFileId = res.headers.get("X-File-Id");
        if (persistedFileId) {
          const rawPersistedName = res.headers.get("X-File-Name");
          const persistedName = rawPersistedName
            ? decodeURIComponent(rawPersistedName)
            : fileName;
          addFile({
            id: persistedFileId,
            fileName: persistedName,
            format: (res.headers.get("X-File-Format") as
              | "docx"
              | "pdf"
              | "pptx"
              | "xlsx") || f,
            kind: "generated",
            createdAt:
              res.headers.get("X-File-Created-At") || new Date().toISOString(),
            sizeBytes:
              Number(res.headers.get("X-File-Size")) || sizeBytes,
            docType: res.headers.get("X-File-Doc-Type") || undefined,
            storagePath:
              res.headers.get("X-File-Storage-Path") || undefined,
            conversationId: null,
            sourceMessageId: null,
            draftJson: draft,
          });
        }
        recordEmit(jobId, {
          format: f,
          fileName,
          blobUrl,
          sizeBytes,
          durationMs,
          warnings,
        });
        setEmittedLinks((prev) => [
          ...prev,
          {
            format: f,
            fileName,
            blobUrl,
            sizeBytes,
            durationMs,
            warnings,
            emittedAt: Date.now(),
          },
        ]);
        setEmitProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "ok" } : p)),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setEmitProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: "fail", error: msg } : p,
          ),
        );
        failEmit(jobId, msg);
      }
    }
    setEmitInFlight(false);
  }, [
    addFile,
    canApprove,
    draft,
    failEmit,
    jobId,
    recordEmit,
    selectedFormats,
    startEmit,
  ]);

  const handleRegenerate = useCallback(() => {
    setRegenOpen(false);
    setEmitProgress([]);
    setEmittedLinks((prev) => {
      for (const l of prev) {
        if (l.blobUrl) URL.revokeObjectURL(l.blobUrl);
      }
      return [];
    });
    regenerateJob(jobId);
  }, [jobId, regenerateJob]);

  const handleDiscard = useCallback(() => {
    setDiscardOpen(false);
    for (const l of emittedLinks) {
      if (l.blobUrl) URL.revokeObjectURL(l.blobUrl);
    }
    dismissJob(jobId);
    closeCanvas();
  }, [closeCanvas, dismissJob, emittedLinks, jobId]);

  const handleClose = useCallback(() => {
    for (const l of emittedLinks) {
      if (l.blobUrl) URL.revokeObjectURL(l.blobUrl);
    }
    closeCanvas();
  }, [closeCanvas, emittedLinks]);

  const scrollToSheet = useCallback((idx: number) => {
    setActiveSheetIdx(idx);
    sheetAnchorsRef.current[idx]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  if (!job) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
        <AlertTriangleIcon className="size-6 text-destructive" />
        <div className="text-center text-sm text-muted-foreground">
          That draft is no longer available.
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Close
        </button>
      </div>
    );
  }

  if (job.state === "running" || job.state === "queued") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3" aria-busy>
        <Loader2Icon className="size-6 animate-spin text-amber-500" />
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Re-running draft…
        </div>
      </div>
    );
  }

  if ((job.state === "error" || !draft) && !job.draft) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <AlertTriangleIcon className="size-8 text-destructive" />
        <div className="text-center">
          <div className="text-lg font-semibold">We couldn&apos;t open this draft</div>
          <div className="mt-1 max-w-md text-sm text-muted-foreground">
            {job.error ?? "Draft generation failed."}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Close
        </button>
      </div>
    );
  }

  if (!draft) return null;

  const language: "en" | "bn" | "mixed" =
    draft.language === "bn"
      ? "bn"
      : draft.language === "mixed"
        ? "mixed"
        : "en";

  const showSheetTabs = draft.format === "xlsx" && sheetCount > 1;

  return (
    <>
      <CanvasHeader
        draft={draft}
        job={job}
        onBack={() => setDiscardOpen(true)}
        onMinimize={closeCanvas}
      />

      {showSheetTabs && (
        <SheetTabs
          sheetNames={(draft.sheets ?? []).map((s) => s.name)}
          activeIdx={activeSheetIdx}
          onSelect={scrollToSheet}
        />
      )}

      <div className="relative flex-1 overflow-hidden">
        <DocumentCanvas
          draft={draft}
          language={language}
          onChange={handleChange}
        />
        {showSheetTabs && (
          <div className="pointer-events-none absolute inset-0 -z-10">
            {(draft.sheets ?? []).map((sheet, i) => (
              <a
                key={`${sheet.name}-${i}`}
                ref={(el) => {
                  sheetAnchorsRef.current[i] = el;
                }}
                aria-hidden
                className="invisible block h-0"
                style={{ scrollMarginTop: "120px" }}
              />
            ))}
          </div>
        )}
      </div>

      {shouldRenderDocFooterChips(draft) && (
        <DocFooterChips citations={draft.citations} />
      )}

      <CanvasFooter
        job={job}
        validationErrors={validationErrors}
        canApprove={canApprove}
        emitInFlight={emitInFlight}
        emitProgress={emitProgress}
        emittedLinks={emittedLinks}
        selectedFormats={selectedFormats}
        showFormatPicker={showFormatPicker}
        onTogglePicker={() => setShowFormatPicker((v) => !v)}
        onToggleFormat={(f) =>
          setSelectedFormats((prev) => {
            const next = new Set(prev);
            if (next.has(f)) next.delete(f);
            else next.add(f);
            return next;
          })
        }
        onApprove={handleEmit}
        onRegenerate={() => setRegenOpen(true)}
        onDiscard={() => setDiscardOpen(true)}
      />

      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your edits and re-run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will throw away your canvas edits and re-run the draft
              agent from your original inputs. The new draft can take 60–210
              seconds to arrive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>
              Discard &amp; regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close the canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              Any unsaved edits and emitted file links will be released. The
              draft itself stays in your sidebar — you can reopen it from
              there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>
              Close canvas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────

function CanvasHeader({
  draft,
  job,
  onBack,
  onMinimize,
}: {
  draft: ResponseSchema;
  job: { lastAutoSaveAt?: number; state: string };
  onBack: () => void;
  onMinimize: () => void;
}) {
  const citationCount = draft.citations?.length ?? 0;
  const savedLabel = useSavedLabel(job.lastAutoSaveAt, job.state === "emitting");

  return (
    <div
      role="banner"
      className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/80 px-4 py-2 backdrop-blur"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Back to chat"
          onClick={onBack}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md",
            "text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
          )}
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground/90">
            {draft.title || "Untitled draft"}
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{draft.document_type}</span>
            <span aria-hidden>·</span>
            <span className="text-amber-500">tier {draft.tier}</span>
            <span aria-hidden>·</span>
            <span>{draft.format}</span>
            <span aria-hidden>·</span>
            <span>{draft.language}</span>
            {citationCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {citationCount} citation{citationCount === 1 ? "" : "s"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          aria-live="polite"
        >
          {savedLabel}
        </div>
        <button
          type="button"
          aria-label="Minimize canvas — reopens from the Generating strip"
          title="Minimize"
          onClick={onMinimize}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md",
            "text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
          )}
        >
          <MinusIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

function useSavedLabel(lastAutoSaveAt: number | undefined, isEmitting: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 5_000);
    return () => window.clearInterval(t);
  }, []);
  void tick;
  if (isEmitting) return "Saving…";
  if (!lastAutoSaveAt) return "Ready";
  const ageSec = Math.max(0, Math.floor((Date.now() - lastAutoSaveAt) / 1000));
  if (ageSec < 5) return "Saved";
  if (ageSec < 60) return `Saved ${ageSec}s ago`;
  const min = Math.floor(ageSec / 60);
  return `Saved ${min}m ago`;
}

function SheetTabs({
  sheetNames,
  activeIdx,
  onSelect,
}: {
  sheetNames: string[];
  activeIdx: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Workbook sheets"
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 bg-muted/30 px-3 py-1"
    >
      {sheetNames.map((name, i) => (
        <button
          key={`${name}-${i}`}
          type="button"
          role="tab"
          aria-selected={i === activeIdx}
          onClick={() => onSelect(i)}
          className={cn(
            "rounded-t-md border border-b-0 px-3 py-1 font-mono text-[11px] transition-colors",
            i === activeIdx
              ? "border-amber-500/40 bg-background text-amber-600 dark:text-amber-400"
              : "border-transparent text-muted-foreground hover:border-border hover:bg-background/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
          )}
        >
          {name || `Sheet ${i + 1}`}
        </button>
      ))}
    </div>
  );
}

function CanvasFooter({
  job,
  validationErrors,
  canApprove,
  emitInFlight,
  emitProgress,
  emittedLinks,
  selectedFormats,
  showFormatPicker,
  onTogglePicker,
  onToggleFormat,
  onApprove,
  onRegenerate,
  onDiscard,
}: {
  job: { error?: string };
  validationErrors: string[];
  canApprove: boolean;
  emitInFlight: boolean;
  emitProgress: EmitProgressEntry[];
  emittedLinks: EmittedFileLink[];
  selectedFormats: Set<ResponseSchemaFormat>;
  showFormatPicker: boolean;
  onTogglePicker: () => void;
  onToggleFormat: (f: ResponseSchemaFormat) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
}) {
  const primaryFormat: ResponseSchemaFormat =
    selectedFormats.size > 0 ? Array.from(selectedFormats)[0] : "docx";
  const primaryLabel =
    selectedFormats.size === 1
      ? `Approve & emit ${primaryFormat.toUpperCase()}`
      : `Approve & emit (${selectedFormats.size} formats)`;

  return (
    <div
      role="contentinfo"
      className="shrink-0 border-t border-border/60 bg-card/80 px-4 py-3 backdrop-blur"
    >
      {validationErrors.length > 0 && (
        <ValidationBanner errors={validationErrors} />
      )}

      {job.error && !emitInFlight && (
        <div
          role="alert"
          className="mb-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px]"
        >
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <div>
            <div className="font-semibold text-destructive">Last emit failed</div>
            <div className="text-muted-foreground">{job.error}</div>
          </div>
        </div>
      )}

      {emitProgress.length > 0 && <EmitProgressList progress={emitProgress} />}

      {emittedLinks.length > 0 && <DownloadList links={emittedLinks} />}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
              "text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50",
            )}
          >
            <Trash2Icon className="size-3.5" /> Discard
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={emitInFlight}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
              "text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-500",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
            )}
          >
            <RefreshCwIcon className="size-3.5" /> Regenerate
          </button>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={showFormatPicker}
            onClick={onTogglePicker}
            disabled={emitInFlight}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs",
              "text-muted-foreground transition-colors hover:border-amber-500/40 hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
            )}
          >
            {selectedFormats.size}/3 formats
            <ChevronDownIcon className="size-3" />
          </button>
          {showFormatPicker && (
            <FormatPicker
              selectedFormats={selectedFormats}
              onToggleFormat={onToggleFormat}
              onClose={onTogglePicker}
            />
          )}
          <button
            type="button"
            onClick={onApprove}
            disabled={!canApprove}
            aria-disabled={!canApprove}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
              "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-900/20",
              "hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-900/30",
              "active:scale-[0.97]",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:from-amber-500 disabled:hover:to-orange-500",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
            )}
          >
            {emitInFlight ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <SparklesIcon className="size-3.5" />
                {primaryLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormatPicker({
  selectedFormats,
  onToggleFormat,
  onClose,
}: {
  selectedFormats: Set<ResponseSchemaFormat>;
  onToggleFormat: (f: ResponseSchemaFormat) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Output formats"
      className={cn(
        "absolute bottom-full right-0 z-20 mb-2 w-56 rounded-md border border-border/80 bg-popover shadow-xl",
      )}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        Emit as
      </div>
      <ul className="space-y-px px-1 pb-2">
        {ALL_FORMATS.map((f) => {
          const Icon = iconFor(f);
          const checked = selectedFormats.has(f);
          return (
            <li key={f}>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={checked}
                onClick={() => onToggleFormat(f)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                  "hover:bg-amber-500/10",
                  "focus-visible:outline-none focus-visible:bg-amber-500/15",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 items-center justify-center rounded border",
                    checked
                      ? "border-amber-500 bg-amber-500/20 text-amber-500"
                      : "border-border",
                  )}
                >
                  {checked ? <CheckCircle2Icon className="size-3" /> : null}
                </span>
                <Icon className="size-3.5 text-muted-foreground" />
                <span className="font-mono uppercase">{f}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ValidationBanner({ errors }: { errors: string[] }) {
  return (
    <div
      role="alert"
      className="mb-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px]"
    >
      <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <div className="font-semibold text-amber-700 dark:text-amber-300">
          Required fields missing
        </div>
        <ul className="mt-0.5 list-inside list-disc text-muted-foreground">
          {errors.map((e) => (
            <li key={e}>{humanizeValidationError(e)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EmitProgressList({ progress }: { progress: EmitProgressEntry[] }) {
  return (
    <ul className="mb-2 space-y-1">
      {progress.map((p) => {
        const Icon = iconFor(p.format);
        return (
          <li
            key={p.format}
            className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-1.5 text-[11px]"
          >
            <Icon className="size-3.5 text-muted-foreground" />
            <span className="font-mono uppercase">{p.format}</span>
            <span aria-hidden>·</span>
            {p.status === "pending" && <span className="text-muted-foreground">queued</span>}
            {p.status === "running" && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <Loader2Icon className="size-3 animate-spin" /> emitting
              </span>
            )}
            {p.status === "ok" && (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2Icon className="size-3" /> ready
              </span>
            )}
            {p.status === "fail" && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertTriangleIcon className="size-3" /> {p.error ?? "failed"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function DownloadList({ links }: { links: EmittedFileLink[] }) {
  return (
    <div className="mb-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
        Generated files
      </div>
      <ul className="space-y-1">
        {links.map((l) => {
          const Icon = iconFor(l.format);
          return (
            <li
              key={`${l.format}-${l.emittedAt}`}
              className="flex items-center gap-2 text-[11px]"
            >
              <Icon className="size-3.5 text-emerald-600" />
              <a
                href={l.blobUrl}
                download={l.fileName}
                className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-300"
              >
                <DownloadIcon className="size-3" /> {l.fileName}
              </a>
              <span className="font-mono text-muted-foreground">
                {(l.sizeBytes / 1024).toFixed(1)} KB
              </span>
              {l.warnings.length > 0 && (
                <span
                  className="font-mono text-amber-600"
                  title={l.warnings.join(", ")}
                >
                  ⚠ {l.warnings.join(", ")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function shouldRenderDocFooterChips(draft: ResponseSchema): boolean {
  if (!draft.citations || draft.citations.length === 0) return false;
  const hasAnyPerSection = (draft.body_sections ?? []).some(
    (s) => Array.isArray(s.citation_refs) && s.citation_refs.length > 0,
  );
  return !hasAnyPerSection;
}

function DocFooterChips({
  citations,
}: {
  citations: ResponseSchema["citations"];
}) {
  return (
    <div
      className="shrink-0 border-t border-border/40 bg-muted/20 px-4 py-2"
      aria-label="Citations"
    >
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        Citations
      </div>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <span
            key={`${c.doc_id}-${c.section}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            title={c.quote}
          >
            <span className="text-amber-500">{c.doc_id}</span>
            <span aria-hidden>§</span>
            <span>{c.section}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function validateRequired(draft: ResponseSchema): string[] {
  const errs: string[] = [];
  if (!draft.title?.trim()) errs.push("title_empty");
  if (!Array.isArray(draft.body_sections) || draft.body_sections.length === 0) {
    errs.push("body_sections_empty");
  } else {
    const blank = draft.body_sections.findIndex((s) => !s.heading?.trim());
    if (blank !== -1) errs.push(`section_${blank + 1}_heading_empty`);
  }
  if (draft.format === "xlsx") {
    if (!Array.isArray(draft.sheets) || draft.sheets.length === 0) {
      errs.push("xlsx_no_sheets");
    } else {
      draft.sheets.forEach((sheet, i) => {
        if (!Array.isArray(sheet.columns) || sheet.columns.length === 0) {
          errs.push(`sheet_${i + 1}_no_columns`);
        }
      });
    }
  }
  return errs;
}

function humanizeValidationError(code: string): string {
  if (code === "title_empty") return "Document title cannot be empty.";
  if (code === "body_sections_empty") return "Add at least one body section.";
  if (code === "xlsx_no_sheets")
    return "Add at least one sheet for an XLSX export.";
  if (code.startsWith("section_") && code.endsWith("_heading_empty")) {
    const n = code.split("_")[1];
    return `Section ${n} is missing a heading.`;
  }
  if (code.startsWith("sheet_") && code.endsWith("_no_columns")) {
    const n = code.split("_")[1];
    return `Sheet ${n} has no columns defined.`;
  }
  return code;
}
