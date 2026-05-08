"use client";

import {
  FileTextIcon,
  FileIcon,
  FileSpreadsheetIcon,
  PresentationIcon,
  ImageIcon,
  MoreHorizontalIcon,
  UploadIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceFile, WorkspaceFileFormat } from "@/store/workspace-store";
import { FileTypeIcon, hasFileTypeIcon } from "./file-type-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FileRowAction = "open" | "edit" | "delete";

interface FilesSidebarRowProps {
  file: WorkspaceFile;
  isActive: boolean;
  /** Unopened generated file — surface a NEW badge until first click. */
  isNew?: boolean;
  compact: boolean;
  /**
   * Called when the row is activated. Receives the clicked element's
   * viewport rect so the canvas modal can anchor its open/close zoom
   * animation to this spot.
   */
  onClick: (originRect: DOMRect) => void;
  /** Kebab-menu action. `edit` only fires when `canEdit` is true. */
  onAction?: (action: FileRowAction) => void;
  /** Enable the Edit action in the kebab. Parent passes true iff the
   *  file carries a rehydratable draft schema. */
  canEdit?: boolean;
  language?: "en" | "bn";
}

const FORMAT_ICON: Record<WorkspaceFileFormat, React.ComponentType<{ className?: string }>> = {
  docx: FileTextIcon,
  pdf: FileIcon,
  xlsx: FileSpreadsheetIcon,
  pptx: PresentationIcon,
  png: ImageIcon,
  jpg: ImageIcon,
  txt: FileIcon,
};

const FORMAT_TINT: Record<WorkspaceFileFormat, string> = {
  docx: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20",
  pdf: "bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20",
  xlsx: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
  pptx: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/20",
  png: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20",
  jpg: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20",
  txt: "bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20",
};

/**
 * Single file card — renders in two variants:
 *   compact=true   → 48×48 icon tile (collapsed sidebar strip)
 *   compact=false  → full row: icon + filename + timestamp + size + kebab
 *
 * The 3-dot menu is a no-op placeholder for Phase 1A. The dropzone
 * card is rendered by the uploaded-sibling component (see files-sidebar).
 */
export function FilesSidebarRow({
  file,
  isActive,
  isNew = false,
  compact,
  onClick,
  onAction,
  canEdit = false,
  language = "en",
}: FilesSidebarRowProps) {
  const Icon = FORMAT_ICON[file.format] ?? FileIcon;
  const tint = FORMAT_TINT[file.format];
  const isUploaded = file.kind === "uploaded";
  // If we have a full-color brand SVG for this format (docx/pdf/pptx/xlsx/jpg/png),
  // drop the colored tint wrapper — the SVG carries its own brand color and the
  // duplicate tint muddies the look. Fall back to Lucide + tinted wrapper for
  // formats without an SVG (e.g. txt).
  const useBrandIcon = hasFileTypeIcon(file.format);
  const wrapperClass = useBrandIcon
    ? "bg-card ring-border/60"
    : tint;

  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => onClick(e.currentTarget.getBoundingClientRect())}
        aria-label={file.fileName}
        title={file.fileName}
        className={cn(
          "cf-compact group relative flex size-11 items-center justify-center rounded-lg mx-auto my-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          isActive
            ? "bg-primary/10 ring-1 ring-primary/40"
            : "hover:bg-accent/40"
        )}
      >
        <span
          className={cn(
            "cf-compact-icon inline-flex items-center justify-center size-8 rounded-md ring-1",
            wrapperClass,
            "group-hover:scale-105"
          )}
        >
          {useBrandIcon ? (
            <FileTypeIcon format={file.format} className="size-6" />
          ) : (
            <Icon className="size-4" />
          )}
        </span>
        {isUploaded && (
          <span
            aria-hidden="true"
            className="absolute bottom-0.5 right-0.5 inline-flex size-3 items-center justify-center rounded-full bg-card ring-1 ring-border"
            title={language === "bn" ? "আপলোড করা" : "Uploaded"}
          >
            <UploadIcon className="size-2 text-muted-foreground" />
          </span>
        )}
        {isNew && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 inline-flex size-2 animate-pulse rounded-full bg-amber-500 ring-2 ring-card"
            title={language === "bn" ? "নতুন" : "New"}
          />
        )}
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary"
          />
        )}
        <style>{`
          .cf-compact {
            transition: background-color 150ms ease-out,
                        box-shadow 150ms ease-out,
                        transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
          }
          .cf-compact:active { transform: scale(0.94); }
          .cf-compact-icon {
            transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
          }
          @media (prefers-reduced-motion: reduce) {
            .cf-compact,
            .cf-compact-icon { transition: none !important; }
            .cf-compact:active { transform: none; }
          }
        `}</style>
      </button>
    );
  }

  // Expanded full row
  return (
    <div
      className={cn(
        "cf-row group relative flex items-start gap-2.5 px-2.5 py-2 mx-1.5 cursor-pointer",
        isActive && "cf-row--active",
      )}
      onClick={(e) => onClick(e.currentTarget.getBoundingClientRect())}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e.currentTarget.getBoundingClientRect());
        }
      }}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r"
          style={{ background: "var(--ledger-rust)" }}
        />
      )}

      <span
        className={cn(
          "mt-0.5 inline-flex shrink-0 items-center justify-center size-8 rounded-md ring-1",
          wrapperClass
        )}
      >
        {useBrandIcon ? (
          <FileTypeIcon format={file.format} className="size-6" />
        ) : (
          <Icon className="size-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="cf-row-name truncate text-[13px]" title={file.fileName}>
            {file.fileName}
          </span>
          {isNew && (
            <span
              className="shrink-0 rounded-sm bg-amber-500/15 px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-600 ring-1 ring-amber-500/40 dark:text-amber-300"
              title={language === "bn" ? "নতুন — খোলা হয়নি" : "New — not opened yet"}
            >
              {language === "bn" ? "নতুন" : "New"}
            </span>
          )}
        </div>
        <div className="cf-row-meta mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em]">
          <span>{formatRelativeTime(file.createdAt, language)}</span>
          <span aria-hidden="true">&middot;</span>
          <span className="tabular-nums">{formatSize(file.sizeBytes)}</span>
          {isUploaded && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span className="inline-flex items-center gap-1">
                <UploadIcon className="size-2.5" />
                {language === "bn" ? "আপলোড" : "uploaded"}
              </span>
            </>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={language === "bn" ? "আরও অপশন" : "More options"}
            title={language === "bn" ? "আরও অপশন" : "More options"}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              // Don't let Enter/Space bubble up to the row's onKeyDown.
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
            className="cf-row-more shrink-0 inline-flex items-center justify-center size-6 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus-visible:outline-none"
          >
            <MoreHorizontalIcon className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => e.stopPropagation()}
          className="w-40"
        >
          <DropdownMenuItem
            onSelect={() => onAction?.("open")}
            className="gap-2 text-xs"
          >
            <EyeIcon className="size-3.5 text-muted-foreground" />
            {language === "bn" ? "দেখুন" : "Open"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              if (!canEdit) {
                e.preventDefault();
                return;
              }
              onAction?.("edit");
            }}
            disabled={!canEdit}
            title={
              canEdit
                ? undefined
                : language === "bn"
                  ? "এই ফাইলটি ক্যানভাসে সম্পাদনাযোগ্য নয়"
                  : "This file can't be re-edited in the canvas"
            }
            className="gap-2 text-xs"
          >
            <PencilIcon className="size-3.5 text-muted-foreground" />
            {language === "bn" ? "সম্পাদনা" : "Edit"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onAction?.("delete")}
            className="gap-2 text-xs text-destructive focus:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
            {language === "bn" ? "মুছুন" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <style>{`
        .cf-row {
          border-radius: 8px;
          transition: background 160ms ease,
                      box-shadow 160ms ease,
                      transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .cf-row:hover { background: var(--ledger-hover); }
        .cf-row:active { transform: scale(0.985); }
        .cf-row--active {
          background: var(--ledger-active);
          box-shadow: inset 1px 0 0 0 var(--ledger-rust);
        }
        @media (prefers-reduced-motion: reduce) {
          .cf-row { transition: none; }
          .cf-row:active { transform: none; }
        }
        .cf-row-name {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-weight: 500;
          color: var(--ledger-ink);
          font-variation-settings: "opsz" 18;
        }
        .cf-row--active .cf-row-name { color: var(--ledger-rust); }
        .cf-row-meta {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: var(--ledger-ink-faint);
        }
        .cf-row-more {
          color: var(--ledger-ink-faint);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
        }
        .cf-row-more:hover {
          color: var(--ledger-ink);
          background: var(--ledger-hover);
          border-color: var(--ledger-rule);
        }
      `}</style>
    </div>
  );
}

/** Format bytes into a short human-readable form. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Relative time — "2 min ago" / "3 d ago". Keeps it compact for a tight row. */
function formatRelativeTime(iso: string, language: "en" | "bn"): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const deltaSec = Math.max(1, Math.floor((now - then) / 1000));

  const s = (n: number, en: string, bn: string) =>
    language === "bn" ? `${n} ${bn}` : `${n} ${en}`;

  if (deltaSec < 60) return s(deltaSec, "s ago", "সে আগে");
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return s(deltaMin, "m ago", "মি আগে");
  const deltaHr = Math.floor(deltaMin / 60);
  if (deltaHr < 24) return s(deltaHr, "h ago", "ঘ আগে");
  const deltaDay = Math.floor(deltaHr / 24);
  return s(deltaDay, "d ago", "দি আগে");
}
