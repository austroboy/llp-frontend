"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";
import { GeneratingJobBadge } from "./generating-job-badge";

interface GeneratingJobsStripProps {
  compact: boolean;
  language?: "en" | "bn";
}

/**
 * Vertical stack of background filegen job badges. Sits in the
 * FilesSidebar above the upload dropzone. Renders nothing when there
 * are no jobs — so collapsed / empty state is invisible.
 *
 * Click behaviour delegated per-badge:
 *   running → requestReopenBuilder(job.id) + setFilesSidebarExpanded
 *             so the PremiumDocButton can spring the modal back open
 *   done    → setActiveFile(job.fileId) → canvas reveals the file
 *   error   → requestReopenBuilder(job.id) → user retries
 */
export function GeneratingJobsStrip({
  compact,
  language = "en",
}: GeneratingJobsStripProps) {
  const jobs = useWorkspaceStore((s) => s.generatingJobs);
  const setActiveFile = useWorkspaceStore((s) => s.setActiveFile);
  const dismissJob = useWorkspaceStore((s) => s.dismissJob);
  const requestReopenBuilder = useWorkspaceStore(
    (s) => s.requestReopenBuilder,
  );
  const openCanvas = useWorkspaceStore((s) => s.openCanvas);

  // Newest first — store already pushes to the front but let's be
  // defensive in case some caller mutates out of order.
  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.startedAt - a.startedAt),
    [jobs],
  );

  if (sortedJobs.length === 0) return null;

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border/60",
        compact ? "py-1" : "py-2",
      )}
      aria-label={
        language === "bn" ? "চলমান তৈরি" : "Active document generation"
      }
    >
      {!compact && (
        <h3 className="px-3.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {language === "bn" ? "তৈরি হচ্ছে" : "Generating"}
        </h3>
      )}
      <div className={cn(compact ? "flex flex-col items-center" : "space-y-0.5")}>
        {sortedJobs.map((job) => (
          <GeneratingJobBadge
            key={job.id}
            job={job}
            compact={compact}
            language={language}
            onClick={() => {
              // Verify jobs have no builder modal — report is inlined on
              // the assistant message. Scroll that bubble back into view
              // if we can find it, otherwise the click is a no-op.
              if (job.kind === "verify") {
                if (job.state === "done" || job.state === "error") {
                  if (job.messageId && typeof document !== "undefined") {
                    const el = document.querySelector(
                      `[data-message-id="${job.messageId}"]`,
                    );
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }
                return;
              }
              if (job.state === "done" && job.fileId) {
                setActiveFile(job.fileId);
              } else if (
                (job.state === "draft_ready" ||
                  job.state === "editing" ||
                  job.state === "emitting") &&
                job.draft
              ) {
                // Custom-path draft in flight — reopen the canvas modal.
                openCanvas(job.id);
              } else {
                // Running or error — re-open the builder modal.
                requestReopenBuilder(job.id);
              }
            }}
            onDismiss={() => dismissJob(job.id)}
          />
        ))}
      </div>
    </div>
  );
}
