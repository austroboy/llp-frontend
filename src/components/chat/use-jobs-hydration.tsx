"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useWorkspaceStore, type GeneratingJob } from "@/store/workspace-store";
import { useChatStore } from "@/store/chat-store";

// Hydrate + live-poll the background-jobs strip from chat_jobs.
//
// Mount once per signed-in chat session. Fetches /api/jobs/active to
// rebuild the sidebar on page load, then polls every 3s while at
// least one running row is present so the user watches progress
// without relying on the originating fetch still being open.
//
// Transitions we care about:
//   running → done   → for filegen, pull the generated file into the
//                      files list so canvas previews work. For verify,
//                      no side-effect (report lives on the row).
//   running → error  → badge flips; no follow-up side effect.
//
// The hook is idempotent; callers can mount it in workspace-layout
// (always-on in the chat shell) without worrying about duplicate polls.

interface ActiveJob {
  id: string;
  kind: "verify" | "filegen";
  state: "running" | "done" | "error";
  label: string;
  conversationId: string | null;
  messageId: string | null;
  result: unknown;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

const POLL_MS = 3000;

export function useJobsHydration() {
  const { isSignedIn } = useUser();
  const hydrateJobs = useWorkspaceStore((s) => s.hydrateJobs);
  const reconcileJob = useWorkspaceStore((s) => s.reconcileJob);
  const fetchFiles = useWorkspaceStore((s) => s.fetchFiles);
  const setMessageVerifyReport = useChatStore((s) => s.setMessageVerifyReport);

  // Remember which jobs we've already delivered side-effects for, so
  // repeated polls don't re-add the same file or re-store the same
  // verify report.
  const sideEffectsAppliedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const applySideEffect = (job: ActiveJob) => {
      if (sideEffectsAppliedRef.current.has(job.id)) return;
      if (job.state !== "done") return;
      if (job.kind === "filegen") {
        // The file row is already in generated_files; re-fetch the
        // list so the sidebar shows it without a manual refresh.
        void fetchFiles({ force: true });
      } else if (job.kind === "verify") {
        const r = job.result as Record<string, unknown> | null;
        if (r && job.messageId && typeof r === "object") {
          setMessageVerifyReport(job.messageId, {
            overall_verdict:
              typeof r.overall_verdict === "string"
                ? r.overall_verdict
                : undefined,
            confidence:
              typeof r.confidence === "number" ? r.confidence : undefined,
            claims: Array.isArray(r.claims)
              ? (r.claims as never)
              : undefined,
            superseded_sections: Array.isArray(r.superseded_sections)
              ? (r.superseded_sections as string[])
              : undefined,
            missing_citations: Array.isArray(r.missing_citations)
              ? (r.missing_citations as string[])
              : undefined,
            summary:
              typeof r.summary === "string" ? r.summary : undefined,
          });
        }
      }
      sideEffectsAppliedRef.current.add(job.id);
    };

    const toGeneratingJob = (j: ActiveJob): GeneratingJob => {
      const result = j.result as Record<string, unknown> | null;
      const fileId =
        result && typeof result === "object" && typeof result.file_id === "string"
          ? (result.file_id as string)
          : undefined;
      const format =
        result && typeof result === "object" && typeof result.format === "string"
          ? (result.format as GeneratingJob["format"])
          : undefined;
      const verdict =
        j.kind === "verify" &&
        result &&
        typeof result === "object" &&
        typeof result.overall_verdict === "string"
          ? (result.overall_verdict as string)
          : undefined;
      return {
        id: j.id,
        kind: j.kind,
        docType: j.kind === "verify" ? "verify_citations" : j.label,
        docTypeLabel: j.label,
        format,
        state: j.state,
        startedAt: j.startedAt,
        completedAt: j.completedAt ?? undefined,
        fileId,
        verdict,
        messageId: j.messageId ?? undefined,
        error: j.error ?? undefined,
      };
    };

    const tick = async (isInitial: boolean) => {
      try {
        const res = await fetch("/api/jobs/active", { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs?: ActiveJob[] };
        const rows = Array.isArray(data.jobs) ? data.jobs : [];
        const mapped = rows.map(toGeneratingJob);
        if (cancelled) return;
        if (isInitial) {
          hydrateJobs(mapped);
        } else {
          for (const row of mapped) reconcileJob(row);
        }
        for (const row of rows) applySideEffect(row);

        const anyRunning = mapped.some((j) => j.state === "running");
        if (anyRunning && !cancelled) {
          timer = setTimeout(() => tick(false), POLL_MS);
        }
      } catch {
        // Silent fail — badge strip is enhancement.
      }
    };

    tick(true);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isSignedIn, hydrateJobs, reconcileJob, fetchFiles, setMessageVerifyReport]);
}
