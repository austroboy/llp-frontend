"use client";

import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import { FilesSidebar } from "./files-sidebar";
import { useJobsHydration } from "./use-jobs-hydration";

interface WorkspaceLayoutProps {
  /** Main chat area — messages + input. Always visible. */
  children: ReactNode;
  /** Files sidebar component — far-right strip. */
  filesSidebar: ReactNode;
  language?: "en" | "bn";
}

/**
 * 2-column workspace shell — main chat + far-right files strip.
 *
 *   ┌───────────────────┬────┐
 *   │   Main chat       │ F  │
 *   │   (flex-grow)     │ i  │
 *   │                   │ l  │
 *   │                   │ e  │
 *   │                   │ s  │
 *   └───────────────────┴────┘
 *
 * File previews no longer sit inline in a third column. Clicking a row
 * in the files sidebar sets the active file on the workspace store,
 * which the <CanvasModal> (mounted at page level) observes and opens.
 *
 * At `md` (768-1023px): files sidebar collapses into a right-side
 * drawer, triggered by the "Workspace" toolbar button.
 *
 * At `sm` (<768px): drawer becomes a fullscreen modal overlay.
 */
export function WorkspaceLayout({
  children,
  filesSidebar,
  language = "en",
}: WorkspaceLayoutProps) {
  const fetchFiles = useWorkspaceStore((s) => s.fetchFiles);
  const filesHydrated = useWorkspaceStore((s) => s.filesHydrated);
  const hasWorkspaceContent = useWorkspaceStore(
    (s) => s.files.length > 0 || s.generatingJobs.length > 0,
  );
  const showFilesSidebar = filesHydrated && hasWorkspaceContent;
  const mobileDocsOpen = useWorkspaceStore((s) => s.mobileDocsOpen);
  const setMobileDocsOpen = useWorkspaceStore((s) => s.setMobileDocsOpen);

  useEffect(() => {
    if (!filesHydrated) {
      void fetchFiles();
    }
  }, [fetchFiles, filesHydrated]);

  // Mount-level hydration: rebuild the job strip from chat_jobs and
  // poll running rows until each one settles. Survives reloads.
  useJobsHydration();

  // Lock body scroll while the mobile docs drawer is open.
  useEffect(() => {
    if (mobileDocsOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileDocsOpen]);

  return (
    <div className="codex-ledger relative flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden">
      {/* MAIN — messages + input, wrapped in the focus-frame card */}
      <section className="relative flex h-full min-w-0 flex-1 flex-col p-3 sm:p-4 md:p-5">
        <div className="codex-chat-frame mx-auto flex h-full w-full min-h-0 max-w-[980px] flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </section>

      {/* FILES SIDEBAR — flush to the far-right page edge, outside the frame */}
      {showFilesSidebar && (
        <section className="hidden lg:flex h-full shrink-0">{filesSidebar}</section>
      )}

      {/* MOBILE DOCS DRAWER — files only, no canvas on mobile */}
      {mobileDocsOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label={language === "bn" ? "ফাইল সাইডবার" : "Files sidebar"}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label={language === "bn" ? "বন্ধ করুন" : "Close"}
            onClick={() => setMobileDocsOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
          />

          {/* Panel — slides from right, files only. Width is 85% of viewport
              so full filenames have room to breathe without fully covering
              the chat behind. */}
          <div
            className={cn(
              "relative ml-auto flex h-full w-[85vw] max-w-[360px] bg-background shadow-2xl",
              "animate-in slide-in-from-right-full duration-300 ease-out"
            )}
          >
            <div className="flex h-full w-full flex-col overflow-hidden">
              {showFilesSidebar ? (
                <FilesSidebar
                  language={language}
                  forceExpanded
                  onClose={() => setMobileDocsOpen(false)}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  {language === "bn"
                    ? "এখনো কোনো ফাইল নেই"
                    : "No files yet. Generate a document from any answer."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{codexLedgerStyles}</style>
    </div>
  );
}

/**
 * Shared Codex palette for the right-hand workspace (files sidebar +
 * canvas modal). Mirrors the variables used by .codex-sidebar so the
 * two halves of the shell read as one continuous ledger.
 */
const codexLedgerStyles = `
  /* Right-hand workspace — glass-warm cream tones, slightly
     lifted from the centered reading column so the two panels frame it. */
  .codex-ledger {
    --ledger-bg: #ede8dc;
    --ledger-bg-deep: #e2dcc8;
    --ledger-ink: #1d1410;
    --ledger-ink-muted: rgba(29, 20, 16, 0.62);
    --ledger-ink-faint: rgba(29, 20, 16, 0.34);
    --ledger-rule: rgba(29, 20, 16, 0.13);
    --ledger-rule-strong: rgba(29, 20, 16, 0.22);
    --ledger-rust: #b25c22;
    --ledger-active: rgba(178, 92, 34, 0.10);
    --ledger-hover: rgba(29, 20, 16, 0.045);
    --ledger-frame: rgba(255, 250, 237, 0.72);
  }
  .dark .codex-ledger {
    --ledger-bg: #121112;
    --ledger-bg-deep: #0c0b0c;
    --ledger-ink: #ede6d8;
    --ledger-ink-muted: rgba(237, 230, 216, 0.62);
    --ledger-ink-faint: rgba(237, 230, 216, 0.34);
    --ledger-rule: rgba(237, 230, 216, 0.10);
    --ledger-rule-strong: rgba(237, 230, 216, 0.18);
    --ledger-rust: #d38044;
    --ledger-active: rgba(211, 128, 68, 0.12);
    --ledger-hover: rgba(237, 230, 216, 0.045);
    --ledger-frame: rgba(22, 19, 18, 0.7);
  }
`;
