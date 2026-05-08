"use client";

import { useEffect, useRef } from "react";
import {
  NotebookPenIcon,
  Loader2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { SummaryCard } from "./summary-card";
import { useChatStore } from "@/store/chat-store";
import { getLabels } from "@/lib/languages";

interface Citation {
  section: string;
  document_id?: string;
  document?: string;
  verbatim?: string;
}

interface SummarizeResponse {
  summary?: string;
  example_scenario?: string;
  cited_sections?: string[];
  _duration_ms?: number;
}

interface SharedProps {
  messageId: string;
  question: string;
  answer: string;
  citations: Citation[];
  /** Chat language code — drives prompt language and card labels. */
  language: string;
}

// Shared request handler — both trigger variants need it (inline pill and
// the future Download-PDF-toolbar row). Promoted to a hook so the component
// stays a thin renderer and the store stays the single source of truth.
function useSummarize({
  messageId,
  question,
  answer,
  citations,
  language,
}: SharedProps): {
  status: "idle" | "loading" | "done" | "error";
  expanded: boolean;
  errorMsg?: string;
  label: string;
  run: () => Promise<void>;
  toggle: () => void;
} {
  const cachedSummary = useChatStore((s) => s.messageSummaries[messageId]);
  const setMessageSummary = useChatStore((s) => s.setMessageSummary);
  const uiState = useChatStore((s) => s.messageSummaryUi[messageId]);
  const setUi = useChatStore((s) => s.setMessageSummaryUi);

  // Derive status from store + cache. Cached summary = done; transient
  // loading/error comes from uiState.
  const status: "idle" | "loading" | "done" | "error" =
    uiState?.status ?? (cachedSummary ? "done" : "idle");
  const expanded = uiState?.expanded ?? true;
  const errorMsg = uiState?.errorMsg;

  // Hydrate ui state once when a cached summary lands (e.g. sidebar
  // reload brought in messages.summary and messageSummaries picked it up).
  useEffect(() => {
    if (cachedSummary && !uiState) {
      setUi(messageId, { status: "done", expanded: true });
    }
  }, [cachedSummary, uiState, messageId, setUi]);

  const inFlightRef = useRef(false);
  const labels = getLabels(language);
  const label = status === "loading" ? labels.summarizeLoading : labels.summarizeIdle;

  const toggle = () => {
    if (status === "done") {
      setUi(messageId, { expanded: !expanded });
    }
  };

  const run = async () => {
    if (status === "loading" || inFlightRef.current) return;
    if (status === "done") {
      toggle();
      return;
    }
    inFlightRef.current = true;
    setUi(messageId, { status: "loading", errorMsg: undefined });
    try {
      const normalized = citations.map((c) => ({
        section: c.section,
        document_id: c.document_id || c.document || "",
      }));
      const res = await fetch("/api/chat/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer,
          citations: normalized,
          language,
          message_id: messageId,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(
          `[summarize] non-OK status=${res.status} body=${errText.slice(0, 200)}`,
        );
        setUi(messageId, { status: "error", errorMsg: labels.summaryUnavailable });
        // Revert to idle after 3s so the user can retry.
        setTimeout(() => setUi(messageId, { status: "idle", errorMsg: undefined }), 3000);
        return;
      }
      const body = (await res.json()) as SummarizeResponse;
      if (!body.summary) {
        setUi(messageId, { status: "error", errorMsg: labels.summaryUnavailable });
        setTimeout(() => setUi(messageId, { status: "idle", errorMsg: undefined }), 3000);
        return;
      }
      setMessageSummary(messageId, {
        summary: body.summary,
        example_scenario: body.example_scenario,
        cited_sections: body.cited_sections,
      });
      setUi(messageId, { status: "done", expanded: true, errorMsg: undefined });
    } catch (err) {
      console.warn("[summarize] fetch error", err);
      setUi(messageId, { status: "error", errorMsg: labels.summaryUnavailable });
      setTimeout(() => setUi(messageId, { status: "idle", errorMsg: undefined }), 3000);
    } finally {
      inFlightRef.current = false;
    }
  };

  return { status, expanded, errorMsg, label, run, toggle };
}

/**
 * Just the Summarize pill — no card. Meant for the icon-action row alongside
 * Download-PDF / Translate / Copy / Save. The expanded summary itself renders
 * via `<SummarizeCardMount>` below the answer.
 */
export function SummarizeTrigger(props: SharedProps) {
  const { status, expanded, label, run } = useSummarize(props);
  return (
    <button
      type="button"
      onClick={run}
      disabled={status === "loading"}
      className="codex-action-secondary"
      aria-live="polite"
    >
      {status === "loading" ? (
        <Loader2Icon className="codex-action-icon size-3.5 animate-spin" />
      ) : (
        <NotebookPenIcon className="codex-action-icon size-3.5" />
      )}
      <span>{label}</span>
      {status === "done" && (
        <>
          {expanded ? (
            <ChevronUpIcon className="size-3.5" />
          ) : (
            <ChevronDownIcon className="size-3.5" />
          )}
        </>
      )}
    </button>
  );
}

/**
 * The expanded amber Summary + Example card. Reads the same shared UI state
 * as `<SummarizeTrigger>` — renders only when status is done AND expanded.
 */
export function SummarizeCardMount(props: SharedProps) {
  const { status, expanded, errorMsg } = useSummarize(props);
  const cachedSummary = useChatStore(
    (s) => s.messageSummaries[props.messageId],
  );
  if (status === "error" && errorMsg) {
    return (
      <p className="pt-1 text-[11px] text-muted-foreground/80 italic">
        {errorMsg}
      </p>
    );
  }
  if (status !== "done" || !expanded || !cachedSummary?.summary) return null;
  return (
    <div className="pt-1">
      <SummaryCard
        summary={cachedSummary.summary}
        exampleScenario={cachedSummary.example_scenario || ""}
        citedSections={cachedSummary.cited_sections || []}
        language={props.language}
      />
    </div>
  );
}

/**
 * Back-compat export — older call sites that wanted both trigger and card in
 * one place. New code should use the split variants.
 * @deprecated Use `SummarizeTrigger` + `SummarizeCardMount` instead.
 */
export function SummarizeButton(props: SharedProps) {
  return (
    <div className="pt-1 space-y-2">
      <SummarizeTrigger {...props} />
      <SummarizeCardMount {...props} />
    </div>
  );
}
