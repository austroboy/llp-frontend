"use client";

import { useState } from "react";
import {
  ShieldCheckIcon,
  Loader2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifyResultCard } from "./verify-result-card";
import { useChatStore } from "@/store/chat-store";
import { useWorkspaceStore } from "@/store/workspace-store";

interface Citation {
  section: string;
  document_id?: string;
  document?: string;
  verbatim?: string;
}

interface VerifyReportClaim {
  claim?: string;
  cited_section?: string;
  verdict?: string;
  evidence?: string;
  evidence_path?: string;
  confidence?: number;
  note?: string;
}

export interface VerifyReport {
  overall_verdict?: string;
  confidence?: number;
  claims?: VerifyReportClaim[];
  superseded_sections?: string[];
  missing_citations?: string[];
  /** Narrative one-paragraph explanation from the verify agent.
   *  Rendered above the per-claim grid. */
  summary?: string;
  _duration_ms?: number;
}

interface VerifyButtonProps {
  messageId: string;
  conversationId?: string | null;
  question: string;
  answer: string;
  citations: Citation[];
  language: "en" | "bn";
}

type Status = "idle" | "loading" | "done" | "error";

/**
 * Verify citations for a single assistant message. Calls /api/chat/verify,
 * which routes through the orchestrator to `llp-chat-verify` (Claude Opus reading the
 * local chat-docs mirror). Silent fallback on errors — verify is enhancement,
 * not core.
 */
export function VerifyButton({
  messageId,
  conversationId,
  question,
  answer,
  citations,
  language,
}: VerifyButtonProps) {
  const setMessageVerifyReport = useChatStore((s) => s.setMessageVerifyReport);
  const cachedReport = useChatStore((s) => s.messageVerifyReports[messageId]);
  const registerVerifyJob = useWorkspaceStore((s) => s.registerVerifyJob);
  const markVerifyDone = useWorkspaceStore((s) => s.markVerifyDone);
  const markVerifyError = useWorkspaceStore((s) => s.markVerifyError);

  const [status, setStatus] = useState<Status>(cachedReport ? "done" : "idle");
  const [report, setReport] = useState<VerifyReport | null>(cachedReport ?? null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [expanded, setExpanded] = useState<boolean>(true);

  const label =
    language === "bn"
      ? status === "loading"
        ? "যাচাই হচ্ছে..."
        : "উদ্ধৃতি যাচাই করুন"
      : status === "loading"
        ? "Verifying..."
        : "Verify citations";

  const handleClick = async () => {
    if (status === "loading") return;
    if (status === "done") {
      setExpanded((e) => !e);
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    // Register a sidebar job so the run is visible even when the user
    // scrolls away from the assistant bubble that spawned it. The
    // client-generated UUID is also sent to /api/chat/verify so the
    // chat_jobs row shares identity with this badge — reload hydrates
    // the same entry instead of a fresh one.
    const jobLabel =
      language === "bn" ? "উদ্ধৃতি যাচাই" : "Verify citations";
    const jobUuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `verify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const jobId = registerVerifyJob({
      messageId,
      docTypeLabel: jobLabel,
      id: jobUuid,
    });
    const failMsg =
      language === "bn"
        ? "যাচাই উপলব্ধ নয়—পরে আবার চেষ্টা করুন।"
        : "Verification unavailable — try again later.";
    try {
      // Normalize citations: the UI side stores {document, section} but the
      // verify route expects {document_id, section}.
      const normalized = citations.map((c) => ({
        section: c.section,
        document_id: c.document_id || c.document || "",
        verbatim: c.verbatim,
      }));
      const res = await fetch("/api/chat/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer,
          citations: normalized,
          language,
          job_id: jobUuid,
          message_id: messageId,
          conversation_id: conversationId ?? undefined,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(
          `[verify-button] non-OK response status=${res.status} body=${errText.slice(0, 200)}`
        );
        setStatus("error");
        setErrorMsg(failMsg);
        markVerifyError(jobId, failMsg);
        return;
      }
      const data = (await res.json()) as VerifyReport;
      setReport(data);
      setStatus("done");
      setExpanded(true);
      setMessageVerifyReport(messageId, {
        overall_verdict: data.overall_verdict,
        confidence: data.confidence,
        claims: data.claims,
        superseded_sections: data.superseded_sections,
        missing_citations: data.missing_citations,
        summary: data.summary,
      });
      markVerifyDone(jobId, data.overall_verdict);
    } catch (err) {
      console.warn("[verify-button] fetch error", err);
      setStatus("error");
      setErrorMsg(failMsg);
      markVerifyError(jobId, failMsg);
    }
  };

  return (
    <div className="pt-1 space-y-2">
      <div>
        <button
          type="button"
          onClick={handleClick}
          disabled={status === "loading"}
          className="codex-action-secondary"
          aria-live="polite"
        >
          {status === "loading" ? (
            <Loader2Icon className="codex-action-icon size-3.5 animate-spin" />
          ) : (
            <ShieldCheckIcon className="codex-action-icon size-3.5" />
          )}
          <span>{label}</span>
          {status === "done" && (
            <>
              <span className="codex-action-verdict">
                {language === "bn"
                  ? verdictLabelBn(report?.overall_verdict)
                  : verdictLabelEn(report?.overall_verdict)}
              </span>
              {expanded ? (
                <ChevronUpIcon className="size-3.5" />
              ) : (
                <ChevronDownIcon className="size-3.5" />
              )}
            </>
          )}
        </button>
      </div>

      {status === "error" && errorMsg && (
        <p className="text-[11px] text-muted-foreground/80 italic">{errorMsg}</p>
      )}

      {status === "done" && expanded && report && (
        <VerifyResultCard report={report} language={language} />
      )}
    </div>
  );
}

function verdictLabelEn(v?: string): string {
  switch (v) {
    case "verified":
      return "Verified";
    case "mostly_verified":
      return "Mostly verified";
    case "mixed":
      return "Mixed";
    case "unverified":
      return "Unverified";
    default:
      return "Checked";
  }
}

function verdictLabelBn(v?: string): string {
  switch (v) {
    case "verified":
      return "যাচাই হয়েছে";
    case "mostly_verified":
      return "মোটামুটি যাচাই হয়েছে";
    case "mixed":
      return "মিশ্র";
    case "unverified":
      return "যাচাই হয়নি";
    default:
      return "পরীক্ষিত";
  }
}
