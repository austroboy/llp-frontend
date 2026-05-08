"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  SearchIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type WorkspaceFile } from "@/store/workspace-store";
import { FilesSidebarRow, type FileRowAction } from "./files-sidebar-row";
import { GeneratingJobsStrip } from "./generating-jobs-strip";
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

interface FilesSidebarProps {
  language?: "en" | "bn";
  /**
   * When true, the sidebar renders expanded regardless of the workspace-store
   * toggle. The header's collapse button is replaced with a close button that
   * fires `onClose`. Used by the mobile docs drawer where full filenames are
   * needed and the collapse-to-icons mode does not apply.
   */
  forceExpanded?: boolean;
  onClose?: () => void;
}

/**
 * Far-right files strip. Two states:
 *   collapsed  → 64px wide, icon-only column
 *   expanded   → 320px wide, full list with search + dropzone
 *
 * Phase 1A: files come from the workspace-store mock array. Phase 2
 * swaps in a real Supabase-backed fetch + upload pipeline.
 */
export function FilesSidebar({ language = "en", forceExpanded, onClose }: FilesSidebarProps) {
  const storeExpanded = useWorkspaceStore((s) => s.filesSidebarExpanded);
  const toggle = useWorkspaceStore((s) => s.toggleFilesSidebar);
  const files = useWorkspaceStore((s) => s.files);
  const activeFileId = useWorkspaceStore((s) => s.activeFileId);
  const setActive = useWorkspaceStore((s) => s.setActiveFile);
  const markFileSeen = useWorkspaceStore((s) => s.markFileSeen);
  const seenFileIds = useWorkspaceStore((s) => s.seenFileIds);
  const removeFile = useWorkspaceStore((s) => s.removeFile);
  const openFileForEdit = useWorkspaceStore((s) => s.openFileForEdit);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    fileName: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const expanded = forceExpanded || storeExpanded;

  // Reset search when collapsed — avoids confusion next time you expand.
  useEffect(() => {
    if (!expanded) setSearch("");
  }, [expanded]);

  const filtered = useMemo(() => {
    if (!search.trim()) return files;
    const q = search.trim().toLowerCase();
    return files.filter((f) => f.fileName.toLowerCase().includes(q));
  }, [files, search]);

  // Group by "today", "yesterday", "earlier" buckets for nicer scanability.
  const grouped = useMemo(() => groupByBucket(filtered), [filtered]);

  const handleAction = (f: WorkspaceFile, action: FileRowAction) => {
    if (action === "open") {
      setActive(f.id, null);
      markFileSeen(f.id);
      return;
    }
    if (action === "edit") {
      if (!f.draftJson) return;
      markFileSeen(f.id);
      openFileForEdit(f.id);
      return;
    }
    if (action === "delete") {
      setPendingDelete({ id: f.id, fileName: f.fileName });
      return;
    }
  };

  return (
    <aside
      className={cn(
        "codex-files h-full shrink-0 flex flex-col",
        "transition-[width] duration-200 ease-out",
        forceExpanded ? "w-full" : expanded ? "w-80" : "w-16"
      )}
      aria-label={language === "bn" ? "ফাইল সাইডবার" : "Files sidebar"}
    >
      {/* Header */}
      <header
        className={cn(
          "codex-files-header flex items-center gap-2.5 h-11 shrink-0",
          expanded ? "px-3" : "px-2 justify-center"
        )}
      >
        {expanded && (
          <>
            <span className="cf-section text-[10px] tracking-[0.28em]">&sect;</span>
            <h2 className="cf-title text-[10px] uppercase tracking-[0.26em]">
              {language === "bn" ? "ফাইল" : "Files"}
            </h2>
            <span className="cf-count ml-auto inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {files.length}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={onClose ?? toggle}
          aria-label={
            onClose
              ? language === "bn" ? "বন্ধ করুন" : "Close"
              : expanded
                ? language === "bn" ? "সাইডবার ছোট করুন" : "Collapse sidebar"
                : language === "bn" ? "সাইডবার বড় করুন" : "Expand sidebar"
          }
          title={onClose ? "Close" : expanded ? "Collapse" : "Expand"}
          className={cn(
            "cf-ibtn inline-flex items-center justify-center size-7",
            expanded ? "" : "mx-auto"
          )}
        >
          {onClose ? (
            <XIcon className="size-3.5" />
          ) : expanded ? (
            <ChevronRightIcon className="size-3.5" />
          ) : (
            <ChevronLeftIcon className="size-3.5" />
          )}
        </button>
      </header>

      {/* Search (expanded only) */}
      {expanded && (
        <div className="px-3 py-2.5 shrink-0 cf-search-wrap">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[color:var(--ledger-ink-faint)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "bn" ? "ফাইল খুঁজুন..." : "Search files..."}
              className="cf-search w-full py-1.5 pl-7 pr-6 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center size-5 rounded-sm text-[color:var(--ledger-ink-faint)] hover:text-[color:var(--ledger-ink)] transition-colors"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Files list */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
        {files.length === 0 ? (
          <EmptyState language={language} compact={!expanded} />
        ) : expanded ? (
          grouped.length === 0 ? (
            <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">
              {language === "bn" ? "কোনো মিল পাওয়া যায়নি" : "No matches"}
            </div>
          ) : (
            <div className="py-2 space-y-4">
              {grouped.map((group, gi) => (
                <div key={group.label}>
                  <div className="cf-group-marker flex items-center gap-2 px-3.5 pb-1.5 text-[9.5px] uppercase tracking-[0.28em]">
                    <span className="cf-section">&sect; {roman(gi + 1)}</span>
                    <span className="cf-group-label">
                      {language === "bn" ? group.labelBn : group.label}
                    </span>
                    <span className="h-px flex-1 bg-[var(--ledger-rule)]" />
                  </div>
                  <div className="space-y-0.5">
                    {group.files.map((f) => (
                      <FilesSidebarRow
                        key={f.id}
                        file={f}
                        isActive={f.id === activeFileId}
                        isNew={f.kind === "generated" && !seenFileIds.includes(f.id)}
                        compact={false}
                        canEdit={!!f.draftJson}
                        onClick={(rect) => {
                          setActive(f.id, rect);
                          markFileSeen(f.id);
                        }}
                        onAction={(action) => handleAction(f, action)}
                        language={language}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="py-1.5 flex flex-col items-center">
            {files.map((f) => (
              <FilesSidebarRow
                key={f.id}
                file={f}
                isActive={f.id === activeFileId}
                isNew={f.kind === "generated" && !seenFileIds.includes(f.id)}
                compact={true}
                canEdit={!!f.draftJson}
                onClick={(rect) => {
                  setActive(f.id, rect);
                  markFileSeen(f.id);
                }}
                onAction={(action) => handleAction(f, action)}
                language={language}
              />
            ))}
          </div>
        )}
      </div>

      {/* Background filegen jobs — pulsing badges that outlive the
          builder modal. Sits ABOVE the dropzone so the cloud-upload
          icon stays pinned to the very bottom. Renders nothing when
          the jobs list is empty. */}
      <GeneratingJobsStrip compact={!expanded} language={language} />

      {/* Upload dropzone — compact icon when collapsed, full dashed panel when expanded */}
      <div className="cf-dropzone-wrap shrink-0">
        {expanded ? (
          <DropzoneExpanded language={language} />
        ) : (
          <DropzoneCompact language={language} />
        )}
      </div>

      <style>{filesStyles}</style>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(v) => {
          if (!v) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "bn"
                ? "এই ফাইলটি মুছবেন?"
                : "Delete this file?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "bn"
                ? `${pendingDelete?.fileName ?? ""} স্থায়ীভাবে মুছে যাবে। এই কাজটি ফিরানো যাবে না।`
                : `${pendingDelete?.fileName ?? ""} will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "bn" ? "বাতিল" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDelete) return;
                const id = pendingDelete.id;
                setPendingDelete(null);
                try {
                  await removeFile(id);
                } catch (err) {
                  console.error("[files-sidebar] delete failed:", err);
                }
              }}
            >
              {language === "bn" ? "মুছুন" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

function roman(n: number): string {
  const m = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return m[n - 1] || String(n);
}

const filesStyles = `
  .codex-files {
    background:
      radial-gradient(120% 50% at 50% -10%, color-mix(in oklab, var(--ledger-rust) 4%, transparent), transparent 60%),
      linear-gradient(180deg, var(--ledger-bg) 0%, var(--ledger-bg-deep) 100%);
    color: var(--ledger-ink);
    border-left: 1px solid var(--ledger-rule);
    font-family: var(--font-inter), system-ui, sans-serif;
  }
  .codex-files-header {
    border-bottom: 1px solid var(--ledger-rule);
    background: color-mix(in oklab, var(--ledger-ink) 2%, transparent);
    backdrop-filter: blur(6px);
  }
  .cf-section { font-family: var(--font-jetbrains), ui-monospace, monospace; color: var(--ledger-rust); }
  .cf-title { font-family: var(--font-jetbrains), ui-monospace, monospace; color: var(--ledger-ink-muted); }
  .cf-count {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    color: var(--ledger-rust);
    background: color-mix(in oklab, var(--ledger-rust) 10%, transparent);
    border: 1px solid color-mix(in oklab, var(--ledger-rust) 22%, transparent);
  }
  .cf-ibtn {
    color: var(--ledger-ink-muted);
    background: transparent;
    border-radius: 8px;
    transition: color 160ms ease, background 160ms ease;
    cursor: pointer;
  }
  .cf-ibtn:hover { color: var(--ledger-ink); background: var(--ledger-hover); }

  .cf-search-wrap { border-bottom: 1px solid var(--ledger-rule); }
  .cf-search {
    background: var(--ledger-frame);
    border: 1px solid var(--ledger-rule);
    border-radius: 8px;
    color: var(--ledger-ink);
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }
  .cf-search::placeholder { color: var(--ledger-ink-faint); font-style: italic; }
  .cf-search:focus {
    outline: none;
    border-color: color-mix(in oklab, var(--ledger-rust) 55%, transparent);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ledger-rust) 14%, transparent);
  }

  .cf-group-marker { color: var(--ledger-ink-muted); }
  .cf-group-label { font-family: var(--font-jetbrains), ui-monospace, monospace; color: var(--ledger-ink-muted); }

  .cf-dropzone-wrap { border-top: 1px solid var(--ledger-rule); }

  .scrollbar-none { scrollbar-width: none; }
  .scrollbar-none::-webkit-scrollbar { display: none; }
`;

function EmptyState({ language, compact }: { language: "en" | "bn"; compact: boolean }) {
  if (compact) {
    return (
      <div className="py-4 flex justify-center">
        <FolderIcon className="size-5" style={{ color: "var(--ledger-ink-faint)" }} />
      </div>
    );
  }
  return (
    <div className="px-4 py-10 text-center">
      <div className="cf-empty-frame mx-auto mb-4 flex size-12 items-center justify-center rounded-xl">
        <FolderIcon className="size-5" style={{ color: "var(--ledger-rust)" }} />
      </div>
      <p className="cf-empty-heading text-[13px]">
        {language === "bn" ? "এখনো কোনো ফাইল নেই" : "No filings on record."}
      </p>
      <p className="cf-empty-body mt-1.5 text-[11.5px] leading-relaxed px-2">
        {language === "bn"
          ? "উত্তরের নিচে ডকুমেন্ট তৈরি করুন বা এখানে ফাইল আপলোড করুন।"
          : "Generate a brief from any answer, or file a document below to begin your records."}
      </p>
      <style>{`
        .cf-empty-frame {
          background: var(--ledger-frame);
          border: 1.5px dashed var(--ledger-rule-strong);
        }
        .cf-empty-heading {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-weight: 500;
          color: var(--ledger-ink);
        }
        .cf-empty-body {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-style: italic;
          font-weight: 300;
          color: var(--ledger-ink-muted);
        }
      `}</style>
    </div>
  );
}

function DropzoneExpanded({ language }: { language: "en" | "bn" }) {
  return (
    <div className="p-3">
      <button
        type="button"
        onClick={() => {
          console.log("Would open file upload dialog — Phase 2");
        }}
        className="cf-drop group w-full flex items-center gap-2.5 px-3 py-3 text-left"
      >
        <div className="cf-drop-icon flex size-8 shrink-0 items-center justify-center rounded-lg">
          <UploadCloudIcon className="size-4" />
        </div>
        <div className="min-w-0 text-left">
          <p className="cf-drop-title text-[12px] truncate">
            {language === "bn" ? "ফাইল আপলোড করুন" : "File a document"}
          </p>
          <p className="cf-drop-sub text-[10px] uppercase tracking-[0.18em] truncate">
            {language === "bn" ? "PDF · DOCX · চিত্র · 5 MB" : "PDF · DOCX · image · 5 MB"}
          </p>
        </div>
      </button>
      <style>{`
        .cf-drop {
          border-radius: 14px;
          border: 1.5px dashed var(--ledger-rule-strong);
          background: color-mix(in oklab, var(--ledger-ink) 2%, transparent);
          transition: border-color 180ms ease, background 180ms ease;
          cursor: pointer;
        }
        .cf-drop:hover {
          border-color: color-mix(in oklab, var(--ledger-rust) 55%, transparent);
          background: color-mix(in oklab, var(--ledger-rust) 6%, transparent);
        }
        .cf-drop-icon {
          background: var(--ledger-frame);
          color: var(--ledger-ink-muted);
          border: 1px solid var(--ledger-rule);
          transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
        }
        .cf-drop:hover .cf-drop-icon {
          color: var(--ledger-rust);
          border-color: color-mix(in oklab, var(--ledger-rust) 45%, transparent);
          background: color-mix(in oklab, var(--ledger-rust) 8%, transparent);
        }
        .cf-drop-title {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-weight: 500;
          color: var(--ledger-ink);
        }
        .cf-drop-sub {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: var(--ledger-ink-faint);
        }
      `}</style>
    </div>
  );
}

function DropzoneCompact({ language }: { language: "en" | "bn" }) {
  return (
    <div className="p-2 flex justify-center">
      <button
        type="button"
        onClick={() => {
          console.log("Would open file upload dialog — Phase 2");
        }}
        aria-label={language === "bn" ? "ফাইল আপলোড করুন" : "Upload a file"}
        title={language === "bn" ? "ফাইল আপলোড করুন" : "Upload a file"}
        className="cf-drop-compact group flex size-10 items-center justify-center"
      >
        <UploadCloudIcon className="size-4" />
      </button>
      <style>{`
        .cf-drop-compact {
          border-radius: 10px;
          border: 1.5px dashed var(--ledger-rule-strong);
          background: color-mix(in oklab, var(--ledger-ink) 2%, transparent);
          color: var(--ledger-ink-muted);
          transition: all 180ms ease;
          cursor: pointer;
        }
        .cf-drop-compact:hover {
          border-color: color-mix(in oklab, var(--ledger-rust) 55%, transparent);
          background: color-mix(in oklab, var(--ledger-rust) 6%, transparent);
          color: var(--ledger-rust);
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Grouping helper — buckets files by Today / Yesterday / Earlier
// ---------------------------------------------------------------------

interface FileGroup {
  label: string;
  labelBn: string;
  files: WorkspaceFile[];
}

function groupByBucket(files: WorkspaceFile[]): FileGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const today: WorkspaceFile[] = [];
  const yesterday: WorkspaceFile[] = [];
  const earlier: WorkspaceFile[] = [];

  for (const f of files) {
    const t = new Date(f.createdAt).getTime();
    if (t >= todayStart) today.push(f);
    else if (t >= yesterdayStart) yesterday.push(f);
    else earlier.push(f);
  }

  const groups: FileGroup[] = [];
  if (today.length) groups.push({ label: "Today", labelBn: "আজ", files: today });
  if (yesterday.length)
    groups.push({ label: "Yesterday", labelBn: "গতকাল", files: yesterday });
  if (earlier.length)
    groups.push({ label: "Earlier", labelBn: "আগের", files: earlier });
  return groups;
}
