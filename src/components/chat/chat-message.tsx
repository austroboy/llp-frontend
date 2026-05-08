"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CopyIcon, CheckIcon, BookmarkIcon, BookmarkCheckIcon, AlertCircleIcon, RefreshCwIcon, BrainIcon, ChevronDownIcon, WrenchIcon, TerminalIcon, XCircleIcon, Undo2Icon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { MessageSourceToggle } from "./message-source-toggle";
import { parseLegalContent } from "./legal-content-parser";
import { CopyLinkButton, EmailShareButton } from "./share-menu";
import { VoteButtons } from "./vote-buttons";
import { useTranslation, TranslateContent, TranslateDropdown } from "./translate-button";
import { FollowupChips } from "./followup-chips";
import { UseCaseCards } from "./use-case-cards";
import { VerifyButton } from "./verify-button";
import { VerifyResultCard } from "./verify-result-card";
import { SummarizeTrigger, SummarizeCardMount } from "./summarize-button";
import { PremiumDocButton } from "./premium-doc-button";
import { DownloadPdfButton } from "./download-pdf-button";
import { ConfidenceBandBanner } from "./confidence-band-banner";
import type { ConfidenceBand } from "@/app/api/chat/confidence-band";
import { parseDocIntent } from "@/lib/documents/index";
import { useLanguage } from "@/hooks/use-language";
import { useChatStore } from "@/store/chat-store";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

interface Citation {
  document_id?: string;
  document: string;
  section: string;
  text: string;
}

interface CitationsAudit {
  total: number;
  verified: number;
  flagged: number;
  corrected: number;
  confidence_avg: number | null;
  invalid: Array<{ section: string; reason: string }>;
  llmVerdicts?: Array<{
    section: string;
    document_id: string;
    verdict: "correct" | "misquoted" | "fabricated" | "partially_correct";
    confidence: number;
    explanation: string;
  }> | null;
}

interface Message {
  id: string;
  content: string;
  /** English source-of-truth when `content` was translated at generation.
   *  Absent or equal to `content` → no collapsible toggle is rendered. */
  content_en?: string | null;
  sender: "user" | "ai";
  timestamp: Date;
  citations?: Citation[];
  /** Cached follow-up chip questions persisted with the assistant
   *  message. When present, FollowupChips renders these directly
   *  instead of re-fetching /api/chat/followup on remount. */
  followups?: string[] | null;
  citationsAudit?: CitationsAudit;
  cta?: { text: string; targetTier: string | null } | null;
  isGuestLimit?: boolean;
  isStreaming?: boolean;
  thinking?: string;
  isThinking?: boolean;
  toolCalls?: Array<{
    id: string;
    name: string;
    args?: unknown;
    result?: unknown;
    status: "running" | "done" | "error";
    error?: string;
  }>;
  /** Turn-1 disambiguation cards. When populated, the bubble is hidden
   *  and this array renders as the message body instead. */
  clarifyOptions?: Array<{
    title: string;
    role: string;
    blurb: string;
    scenario_query: string;
  }>;
  clarifyReason?: string;
  /** Phase A — turn-2+ team-lead delegation indicator. `pending` →
   *  pulse + "Verifying §X"; `complete` → badge; `error`/`timeout` →
   *  final state when sub-agent fails. */
  delegationStatus?: {
    agent: string;
    state: "pending" | "complete" | "error" | "timeout";
    started_at: string;
    finished_at?: string;
    section?: string | null;
    intent?: string;
    verdict?: "agree" | "disagree" | "partial" | "not_verifiable";
    result_summary?: string;
    error_message?: string;
    trace_id?: string;
  };
  /** When true, a deep_search_report event hydrated
   *  `messageVerifyReports[id]` and the inline VerifyResultCard should
   *  render without a manual Verify click. */
  deepSearchReport?: boolean;
  /** G1 Honesty Guard — populated by `confidence_band` NDJSON event when
   *  any verdict was not_verifiable / partial / disagree. Null/absent on
   *  flag-OFF turns (server gate: ENABLE_HONESTY_GUARD) and on turns
   *  with all-agreeing verdicts. Drives the banner above the AI bubble. */
  confidenceBand?: ConfidenceBand;
}

interface ChatMessageProps {
  message: Message;
  conversationId?: string;
  conversationTitle?: string;
  onServiceRequest?: (service: any) => void;
  onSuggestionClick?: (text: string) => void;
  onFocusInput?: () => void;
  isLastMessage?: boolean;
}

/** Strip DOC-xxx node IDs from answer text and apply legal content parsing */
function prepareContent(content: string): string {
  const cleaned = content
    .replace(/,?\s*DOC-\d{3}(?:-\d{4}){0,3}/g, "")
    .replace(/\(\s*\)/g, "");
  return parseLegalContent(cleaned);
}

function CopyButton({ content, citations }: { content: string; citations?: Citation[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    // Format: answer + cited sections + disclaimer
    let formatted = content;
    if (citations && citations.length > 0) {
      const refs = citations.map((c) => `- ${c.section} (${c.document || "Bangladesh Labour Act"})`).join("\n");
      formatted += `\n\nSources:\n${refs}`;
    }
    formatted += "\n\n---\nAI-assisted guidance via Labor Law Partner. Verify with a qualified professional for specific matters.";

    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = formatted;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content, citations]);

  return (
    <span className="relative inline-flex">
      <button
        onClick={handleCopy}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title={copied ? "Copied!" : "Copy message"}
      >
        {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
      </button>
      {copied && (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background shadow-md motion-reduce:animate-none"
          style={{ animation: "copyToastIn 120ms cubic-bezier(0.23, 1, 0.32, 1) both, copyToastOut 140ms ease-out 1.2s both" }}
        >
          Copied
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-foreground"
          />
        </span>
      )}
      {copied && (
        <style>{`
          @keyframes copyToastIn { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }
          @keyframes copyToastOut { from { opacity: 1; } to { opacity: 0; } }
        `}</style>
      )}
    </span>
  );
}

function SaveButton({
  messageId,
  content,
  conversationId,
}: {
  messageId: string;
  content: string;
  conversationId?: string | null;
}) {
  const { user } = useUser();
  const userId = user?.id;
  const savedRow = useQuery(
    api.savedItems.getByItemId,
    userId ? { userId, itemId: messageId } : "skip",
  );
  const isSaved = !!savedRow;
  const save = useMutation(api.savedItems.save);
  const unsave = useMutation(api.savedItems.unsave);

  // Silent backfill: older rows were stored without content/conversationId.
  // Re-save (idempotent — patches missing fields) so /dashboard/saved can
  // expand the body and deep-link back to the source conversation.
  const backfilled = useRef(false);
  useEffect(() => {
    if (!userId || !savedRow || backfilled.current) return;
    const needsContent = !savedRow.content && !!content;
    const needsConv = !savedRow.conversationId && !!conversationId;
    if (!needsContent && !needsConv) return;
    backfilled.current = true;
    void save({
      userId,
      itemType: "search_result",
      itemId: messageId,
      title: content.slice(0, 100),
      preview: content.slice(0, 200),
      content,
      ...(conversationId ? { conversationId } : {}),
    });
  }, [userId, savedRow, content, conversationId, messageId, save]);

  if (!userId) return null;

  const handleToggle = async () => {
    if (isSaved) {
      await unsave({ userId, itemId: messageId });
    } else {
      await save({
        userId,
        itemType: "search_result",
        itemId: messageId,
        title: content.slice(0, 100),
        preview: content.slice(0, 200),
        content,
        ...(conversationId ? { conversationId } : {}),
      });
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={isSaved ? "Unsave" : "Save"}
    >
      {isSaved ? <BookmarkCheckIcon className="h-4 w-4 text-primary" /> : <BookmarkIcon className="h-4 w-4" />}
    </button>
  );
}

/**
 * Rich in-bubble loading state shown while the assistant message is
 * streaming but has not yet emitted any content tokens. Rotates through
 * three narration stages with a subtle slide+fade swap, and fills the
 * bubble with three skeleton lines so the empty space doesn't feel
 * dead. Consumer hides the disclaimer while this is on screen.
 */
function DraftingTray() {
  const stages = [
    "Consulting the Labour Act and rules",
    "Cross-referencing amendments",
    "Shaping the citation stack",
  ];
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 2600);
    const t2 = setTimeout(() => setStage(2), 6400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="drafting-tray relative">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.26em]">
        <span className="drafting-section">&sect;</span>
        <span className="drafting-label">Drafting</span>
        <span className="drafting-rule h-px flex-1" />
        <span className="drafting-dots">
          <i></i><i></i><i></i>
        </span>
      </div>

      <div className="mt-2.5 min-h-[1.3em] text-[13px] leading-snug">
        <span key={stage} className="drafting-stage-text">
          {stages[stage]}&hellip;
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="drafting-skel drafting-skel-1 h-3 rounded" />
        <div className="drafting-skel drafting-skel-2 h-3 w-[92%] rounded" />
        <div className="drafting-skel drafting-skel-3 h-3 w-[78%] rounded" />
      </div>

      <style>{`
        .drafting-section {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: hsl(var(--primary));
        }
        .drafting-label {
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          color: hsl(var(--muted-foreground));
        }
        .drafting-rule { background: hsl(var(--border)); }
        .drafting-dots { display: inline-flex; gap: 3px; }
        .drafting-dots i {
          width: 4px; height: 4px; border-radius: 9999px;
          background: hsl(var(--primary));
          display: inline-block;
          animation: draftingDot 1.2s ease-in-out infinite;
        }
        .drafting-dots i:nth-child(2) { animation-delay: 0.18s; }
        .drafting-dots i:nth-child(3) { animation-delay: 0.36s; }
        @keyframes draftingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%           { transform: translateY(-3px); opacity: 1; }
        }

        .drafting-stage-text {
          font-family: var(--font-fraunces), var(--font-lora), serif;
          font-style: italic;
          color: hsl(var(--foreground) / 0.82);
          font-variation-settings: "opsz" 20;
          animation: draftingStageIn 340ms cubic-bezier(0.22, 1, 0.36, 1) both;
          display: inline-block;
        }
        @keyframes draftingStageIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .drafting-skel {
          /* Light-mode rust shimmer — mirrors the dark-mode bars but on
             a paper-friendly palette (deep rust → warm orange → deep rust). */
          background: linear-gradient(90deg,
            rgba(178, 92, 34, 0.18) 0%,
            rgba(211, 128, 68, 0.42) 50%,
            rgba(178, 92, 34, 0.18) 100%);
          background-size: 200% 100%;
          animation: draftingShimmer 1.6s linear infinite;
        }
        .drafting-skel-1 { animation-delay: 0ms; }
        .drafting-skel-2 { animation-delay: 120ms; }
        .drafting-skel-3 { animation-delay: 240ms; }
        @keyframes draftingShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .drafting-dots i,
          .drafting-stage-text,
          .drafting-skel { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function ThinkingBlock({ thinking, isThinking }: { thinking: string; isThinking?: boolean }) {
  // Default: expanded while reasoning live, auto-collapse once done.
  const [open, setOpen] = useState<boolean>(!!isThinking);
  const autoCollapsedRef = useRef(false);

  useEffect(() => {
    if (!isThinking && !autoCollapsedRef.current) {
      autoCollapsedRef.current = true;
      setOpen(false);
    }
    if (isThinking) {
      autoCollapsedRef.current = false;
      setOpen(true);
    }
  }, [isThinking]);

  if (!thinking || thinking.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-2 rounded-xl border border-border/60 bg-muted/40 text-xs",
        isThinking && "animate-pulse motion-reduce:animate-none",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <BrainIcon className="size-3.5 shrink-0" />
        <span className="font-medium">
          {isThinking ? "Thinking..." : "Thought process"}
        </span>
        <span className="ml-auto text-[10px] opacity-60">
          {thinking.length} chars
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border/50 px-3 py-2 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed text-muted-foreground/90">
          {thinking}
        </div>
      )}
    </div>
  );
}

type ToolCall = NonNullable<Message["toolCalls"]>[number];

function ToolCallRow({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false);
  const Icon = call.status === "error" ? XCircleIcon : call.name.startsWith("bash") || call.name.startsWith("shell") ? TerminalIcon : WrenchIcon;
  const statusColor =
    call.status === "running"
      ? "text-amber-500"
      : call.status === "error"
        ? "text-destructive"
        : "text-emerald-500";

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
      >
        <Icon className={cn("size-3.5 shrink-0", statusColor, call.status === "running" && "animate-pulse motion-reduce:animate-none")} />
        <span className="font-mono text-[11px] truncate">{call.name}</span>
        <span className={cn("ml-auto text-[10px] uppercase tracking-wide", statusColor)}>
          {call.status}
        </span>
        <ChevronDownIcon className={cn("size-3 shrink-0 transition-transform", open ? "rotate-180" : "rotate-0")} />
      </button>
      {open && (
        <div className="border-t border-border/50 px-2.5 py-2 space-y-1.5 bg-background/40">
          {call.args !== undefined && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">args</div>
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto text-muted-foreground/90">
                {typeof call.args === "string" ? call.args : JSON.stringify(call.args, null, 2)}
              </pre>
            </div>
          )}
          {call.result !== undefined && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">result</div>
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto text-foreground/90">
                {typeof call.result === "string" ? call.result : JSON.stringify(call.result, null, 2)}
              </pre>
            </div>
          )}
          {call.error && (
            <div className="text-destructive text-[11px] font-mono">{call.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolCallsBlock({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (!toolCalls || toolCalls.length === 0) return null;
  return (
    <div className="mb-2 space-y-1">
      {toolCalls.map((tc) => (
        <ToolCallRow key={tc.id} call={tc} />
      ))}
    </div>
  );
}

/**
 * Phase A — renders the team-lead → verify delegation state.
 * `pending` → rust pulse + "Verifying §X (agent)".
 * `complete` → emerald badge + "Verified by agent".
 * `error` / `timeout` → slate badge surfacing that the sub-agent failed
 * so the followup turn still streams without a hanging pulse.
 * Silent when status absent.
 */
function DelegationIndicator({ status }: { status: NonNullable<Message["delegationStatus"]> }) {
  const section = status.section?.trim();
  if (status.state === "error" || status.state === "timeout") {
    const label =
      status.state === "timeout"
        ? section ? `Verification timed out · ${section}` : "Verification timed out"
        : section ? `Verification unavailable · ${section}` : "Verification unavailable";
    return (
      <div
        role="status"
        aria-live="polite"
        title={status.error_message ?? undefined}
        className="delegation-indicator delegation-indicator--muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
      >
        <SearchIcon className="size-3.5 shrink-0 opacity-60" />
        <span className="font-medium">{label}</span>
        <span className="delegation-agent">{status.agent}</span>
        <style>{`
          .delegation-indicator--muted {
            color: #52525b;
            background: color-mix(in oklab, #71717a 8%, transparent);
            border: 1px solid color-mix(in oklab, #71717a 24%, transparent);
            font-family: var(--font-jetbrains), ui-monospace, monospace;
            letter-spacing: 0.02em;
          }
          .dark .delegation-indicator--muted {
            color: #d4d4d8;
            background: color-mix(in oklab, #a1a1aa 10%, transparent);
            border-color: color-mix(in oklab, #a1a1aa 30%, transparent);
          }
          .delegation-indicator--muted .delegation-agent {
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            opacity: 0.65;
            border-left: 1px solid currentColor;
            padding-left: 8px;
            margin-left: 2px;
          }
        `}</style>
      </div>
    );
  }
  if (status.state === "pending") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="delegation-indicator delegation-indicator--pending inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px]"
      >
        <span aria-hidden="true" className="delegation-pulse-dot" />
        <SearchIcon className="size-3.5 shrink-0" />
        <span className="font-medium">
          {section ? `Verifying ${section}` : "Verifying sources"}
          <span aria-hidden="true" className="delegation-dots">
            <i></i><i></i><i></i>
          </span>
        </span>
        <span className="delegation-agent">{status.agent}</span>
        <style>{`
          .delegation-indicator--pending {
            color: #7a3a10;
            background: color-mix(in oklab, #b25c22 10%, transparent);
            border: 1px solid color-mix(in oklab, #b25c22 32%, transparent);
            font-family: var(--font-jetbrains), ui-monospace, monospace;
            letter-spacing: 0.02em;
          }
          .dark .delegation-indicator--pending {
            color: #f0c8a0;
            background: color-mix(in oklab, #d38044 14%, transparent);
            border-color: color-mix(in oklab, #d38044 40%, transparent);
          }
          .delegation-pulse-dot {
            width: 7px; height: 7px; border-radius: 9999px;
            background: #b25c22;
            box-shadow: 0 0 0 0 rgba(178, 92, 34, 0.6);
            animation: delegationPulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          .dark .delegation-pulse-dot { background: #d38044; box-shadow: 0 0 0 0 rgba(211, 128, 68, 0.6); }
          @keyframes delegationPulse {
            0%   { box-shadow: 0 0 0 0 rgba(178, 92, 34, 0.55); }
            70%  { box-shadow: 0 0 0 8px rgba(178, 92, 34, 0);   }
            100% { box-shadow: 0 0 0 0 rgba(178, 92, 34, 0);     }
          }
          .delegation-dots { display: inline-flex; gap: 2px; margin-left: 2px; }
          .delegation-dots i {
            width: 3px; height: 3px; border-radius: 9999px;
            background: currentColor; display: inline-block; opacity: 0.5;
            animation: delegationDot 1.2s ease-in-out infinite;
          }
          .delegation-dots i:nth-child(2) { animation-delay: 0.18s; }
          .delegation-dots i:nth-child(3) { animation-delay: 0.36s; }
          @keyframes delegationDot {
            0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
            30%           { opacity: 1;    transform: translateY(-2px); }
          }
          .delegation-agent {
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            opacity: 0.7;
            border-left: 1px solid currentColor;
            padding-left: 8px;
            margin-left: 2px;
          }
          @media (prefers-reduced-motion: reduce) {
            .delegation-pulse-dot,
            .delegation-dots i { animation: none !important; }
          }
        `}</style>
      </div>
    );
  }

  // complete
  return (
    <div
      role="status"
      aria-live="polite"
      className="delegation-indicator delegation-indicator--complete inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
    >
      <ShieldCheckIcon className="size-3.5 shrink-0" />
      <span className="font-medium">
        {section ? `Verified ${section}` : "Verified"}
      </span>
      <CheckIcon className="size-3 shrink-0" />
      <span className="delegation-agent">{status.agent}</span>
      <style>{`
        .delegation-indicator--complete {
          color: #15803d;
          background: color-mix(in oklab, #10b981 10%, transparent);
          border: 1px solid color-mix(in oklab, #10b981 32%, transparent);
          font-family: var(--font-jetbrains), ui-monospace, monospace;
          letter-spacing: 0.02em;
        }
        .dark .delegation-indicator--complete {
          color: #86efac;
          background: color-mix(in oklab, #10b981 14%, transparent);
          border-color: color-mix(in oklab, #10b981 38%, transparent);
        }
        .delegation-indicator--complete .delegation-agent {
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          opacity: 0.7;
          border-left: 1px solid currentColor;
          padding-left: 8px;
          margin-left: 2px;
        }
      `}</style>
    </div>
  );
}

export function ChatMessage({ message, conversationId, conversationTitle, onServiceRequest, onSuggestionClick, onFocusInput, isLastMessage }: ChatMessageProps) {
  const userTier = useChatStore((s) => s.userTier);
  const allMessages = useChatStore((s) => s.messages);
  const chatLanguage = useChatStore((s) => s.chatLanguage);
  const messageSummariesMap = useChatStore((s) => s.messageSummaries);
  const messageVerifyReportsMap = useChatStore((s) => s.messageVerifyReports);
  const { language } = useLanguage();
  const { user } = useUser();
  const isAdmin =
    (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  // On-demand translation state
  const translation = useTranslation(message.id, message.content);

  const hasCitations = message.sender === "ai" && message.citations && message.citations.length > 0;
  const isError = message.sender === "ai" && message.content.startsWith("Error:");
  const isNoSources = message.sender === "ai" && hasCitations === false && !isError && !message.isGuestLimit && message.content.length > 50;

  // Find the prior user question that preceded this assistant message
  // (used as context for the follow-up chips agent).
  const priorUserQuestion = (() => {
    if (message.sender !== "ai") return "";
    const idx = allMessages.findIndex((m) => m.id === message.id);
    if (idx <= 0) return "";
    for (let i = idx - 1; i >= 0; i--) {
      const m = allMessages[i];
      // store-shape uses `role` not `sender`
      const role = (m as { role?: string }).role;
      if (role === "user" && typeof m.content === "string") return m.content;
    }
    return "";
  })();

  // Turn-1 clarify mode: the chat-proxy turn-1 model decided the query
  // was too broad to answer in ≤150 words and emitted scenario cards
  // instead. The bubble is hidden; `<UseCaseCards>` renders in its place.
  const hasClarifyCards =
    message.sender === "ai" &&
    Array.isArray(message.clarifyOptions) &&
    message.clarifyOptions.length > 0;


  // Follow-up chip eligibility. Unchanged from before — only on the
  // latest assistant message, when it has citations AND is NOT a
  // clarify-mode message (clarify mode has no citations).
  const showFollowups =
    message.sender === "ai" &&
    !isError &&
    !message.isGuestLimit &&
    message.content.length > 50 &&
    isLastMessage === true &&
    Array.isArray(message.citations) &&
    message.citations.length > 0 &&
    priorUserQuestion.length > 0 &&
    !hasClarifyCards;

  // Verify / Summarize / Generate-doc row — scoped to the latest assistant
  // message only. One action bar at the end of the conversation covering
  // the whole thread instead of one-per-message clutter.
  const showVerify =
    message.sender === "ai" &&
    !isError &&
    !message.isGuestLimit &&
    isLastMessage === true &&
    Array.isArray(message.citations) &&
    message.citations.length > 0 &&
    priorUserQuestion.length > 0;

  const revertToUserMessage = useChatStore((s) => s.revertToUserMessage);

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "flex gap-4 group chat-row-enter",
        message.sender === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.sender === "ai" && (
        <div className="shrink-0 hidden sm:block">
          <div
            className={cn(
              "size-8 rounded-full bg-secondary flex items-center justify-center relative",
              message.isStreaming && "ai-avatar-breathing"
            )}
          >
            <Logo className="size-6" />
            {message.isStreaming && (
              <span aria-hidden="true" className="ai-avatar-halo absolute inset-0 rounded-full" />
            )}
          </div>
        </div>
      )}

      {message.sender === "user" && (
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              const ok = window.confirm("Revert to this point? This removes this message and everything after it.");
              if (!ok) return;
            }
            revertToUserMessage(message.id);
          }}
          title="Revert to this point"
          aria-label="Revert to this point"
          className="self-center opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none inline-flex items-center justify-center size-7 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Undo2Icon className="size-3.5" />
        </button>
      )}

      <div
        className={cn(
          message.sender === "user"
            ? "codex-user-bubble max-w-[80%] rounded-[18px] px-4 py-3"
            : "max-w-full sm:max-w-[85%] space-y-3"
        )}
      >
        {message.sender === "user" ? (
          <p className="codex-user-text text-[14px] leading-relaxed">{message.content}</p>
        ) : (
          <>
            {/* 1. Answer or Error */}
            {isError ? (
              <div className="rounded-2xl px-4 py-3 bg-destructive/10 border border-destructive/20 text-sm space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>We couldn&apos;t process your question right now. Please try again in a moment.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Find the user message before this one and resend
                    const store = useChatStore.getState();
                    const msgs = store.messages;
                    const idx = msgs.findIndex((m) => m.id === message.id);
                    if (idx > 0) {
                      const userMsg = msgs[idx - 1];
                      if (userMsg.role === "user") {
                        if (onSuggestionClick) {
                          onSuggestionClick(userMsg.content);
                        } else {
                          // Fallback: use store sendMessage directly
                          store.sendMessage(userMsg.content, "gemini-2.5-flash");
                        }
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <RefreshCwIcon className="size-3.5" />
                  Retry
                </button>
              </div>
            ) : hasClarifyCards && !message.isStreaming ? (
              // Turn-1 clarify mode — bubble is hidden, cards are the body.
              onSuggestionClick && (
                <UseCaseCards
                  options={message.clarifyOptions!}
                  reason={message.clarifyReason}
                  language={language}
                  onCardClick={onSuggestionClick}
                  onFocusInput={onFocusInput}
                />
              )
            ) : (
              <div className="space-y-0">
                {message.thinking && (
                  <ThinkingBlock thinking={message.thinking} isThinking={message.isThinking} />
                )}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <ToolCallsBlock toolCalls={message.toolCalls} />
                )}
                {/* G1 Honesty Guard banner — renders only when the
                    `confidence_band` event populated this field (server-
                    side flag ENABLE_HONESTY_GUARD=1 + at least one
                    non-agreeing verdict). Admin-only until first-run
                    verification consistently produces trustable-green
                    verdicts — surfacing low-confidence to clients
                    erodes trust. Admins still see it for diagnostic
                    work; ungate when accuracy proves itself. */}
                {isAdmin && (
                  <ConfidenceBandBanner band={message.confidenceBand} />
                )}
                <div className={cn(
                  "codex-ai-bubble rounded-[18px] px-5 py-4 text-[14px] leading-relaxed space-y-1 relative",
                  message.isStreaming && "ai-bubble-streaming",
                  message.isStreaming && !message.content && "codex-drafting-bubble"
                )}>
                  {message.isStreaming && !message.content ? (
                    <DraftingTray />
                  ) : (
                    <MarkdownRenderer content={prepareContent(message.content)} className="prose-sm" isStreaming={message.isStreaming} />
                  )}
                </div>
                {message.sender === "ai" &&
                  !message.isStreaming &&
                  message.content_en &&
                  message.content_en !== message.content && (
                    <MessageSourceToggle sourceText={message.content_en} />
                  )}
              </div>
            )}

            {/* 2b. No sources notice — hidden on clarify-mode messages */}
            {isNoSources && !isError && !hasClarifyCards && (
              <p className="text-[11px] text-muted-foreground font-mono bg-muted/50 rounded px-2.5 py-1.5">
                No matching source provisions found in the current document set.
              </p>
            )}

            {/* Phase A — team-lead → verify delegation indicator slot.
                Renders pulse when pending, emerald badge when complete.
                Hidden on error / drafting / clarify-mode messages. */}
            {!isError && !(message.isStreaming && !message.content) && !hasClarifyCards && message.delegationStatus && (
              <DelegationIndicator status={message.delegationStatus} />
            )}

            {/* 3. Disclaimer — hidden while drafting to let the tray
                breathe, and hidden on clarify-mode since there's no
                answer content yet to disclaim. */}
            {!isError && !(message.isStreaming && !message.content) && !hasClarifyCards && (
              <p className="text-[11px] text-muted-foreground/60 italic">
                AI-assisted guidance — verify with a qualified professional for specific matters.
              </p>
            )}

            {/* 3b. Translation block — between disclaimer and actions */}
            {message.sender === "ai" && !isError && !message.isGuestLimit && message.content.length > 0 && (
              <TranslateContent
                translatedText={translation.translatedText}
                selectedLangLabel={translation.selectedLangLabel}
                isTranslating={translation.isTranslating}
                showTranslation={translation.showTranslation}
                hideTranslation={translation.hideTranslation}
              />
            )}

            {/* Guest limit CTA */}
            {message.isGuestLimit && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 space-y-2">
                <p className="text-xs text-muted-foreground">{message.content}</p>
                <div className="flex gap-2">
                  <a href="/sign-up" className="inline-flex items-center gap-1 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                    Sign up free →
                  </a>
                  <a href="/sign-in" className="inline-flex items-center gap-1 text-xs text-muted-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                    Sign in
                  </a>
                </div>
              </div>
            )}

            {/* Actions — one row per conversation, anchored on the latest
                assistant message. Hidden on clarify-mode messages (no answer
                to act on) and while the assistant is still streaming. */}
            {conversationId && !hasClarifyCards && !message.isStreaming && isLastMessage === true && message.sender === "ai" && (
              <div className="flex items-center">
                {/* Far-left action pill(s). Lives in the same row as the
                    icon group so the toolbar reads as one strip. The
                    summary card itself renders below via SummarizeCardMount
                    so it can span the full message width instead of being
                    cramped inside this flex row. */}
                {showVerify && (
                  <SummarizeTrigger
                    messageId={message.id}
                    question={priorUserQuestion}
                    answer={message.content_en || message.content}
                    citations={(message.citations || []).map((c) => ({
                      section: c.section,
                      document_id: c.document_id || c.document,
                      document: c.document,
                      verbatim: c.text,
                    }))}
                    language={language}
                  />
                )}
                <div className="ml-auto flex items-center gap-1">
                  {message.sender === "ai" && conversationId && conversationTitle && (
                    <DownloadPdfButton
                      variant="icon"
                      conversationId={conversationId}
                      conversationTitle={conversationTitle}
                      hasEnglishSource={!!message.content_en}
                      hasAnySummary={!!messageSummariesMap[message.id]}
                      hasAnyVerify={!!messageVerifyReportsMap[message.id]}
                    />
                  )}
                  {message.sender === "ai" && conversationId && (
                    <VoteButtons messageId={message.id} conversationId={conversationId} />
                  )}
                  {message.sender === "ai" && !isError && !message.isGuestLimit && message.content.length > 0 && (
                    <TranslateDropdown
                      showTranslation={translation.showTranslation}
                      selectedLang={translation.selectedLang}
                      cache={translation.cache}
                      onTranslate={translation.handleTranslate}
                      onHide={translation.hideTranslation}
                    />
                  )}
                  <SaveButton
                    messageId={message.id}
                    content={message.content}
                    conversationId={conversationId}
                  />
                  <CopyButton content={message.content} citations={message.citations} />
                  <CopyLinkButton
                    scope="message"
                    conversationId={conversationId}
                    messageId={message.id}
                  />
                  <EmailShareButton
                    scope="message"
                    conversationId={conversationId}
                    messageId={message.id}
                  />
                </div>
              </div>
            )}

            {/* Turn-2+ follow-up question chips. Narrower drill-downs
                inside the user's chosen lane. Silent fail.
                Pass chatLanguage (response lang, full 9-lang enum) not
                `language` (UI locale — en/bn only), so followups match
                the chat output language the user is reading in. */}
            {showFollowups && onSuggestionClick && (
              <FollowupChips
                question={priorUserQuestion}
                answer={message.content}
                citations={(message.citations || []).map((c) => ({
                  section: c.section,
                  document: c.document,
                }))}
                language={chatLanguage}
                onChipClick={onSuggestionClick}
                onFocusInput={onFocusInput}
                messageId={message.id}
                conversationId={conversationId}
                persistedFollowups={
                  Array.isArray(message.followups) ? message.followups : null
                }
              />
            )}

            {/* Deep Search inline verify card — admin-only. Verdicts
                can read as "Mixed results / Unknown" and confuse regular
                users; moderation + audit consumers see it, end-users
                just see the answer. */}
            {message.deepSearchReport &&
              isAdmin &&
              messageVerifyReportsMap[message.id] && (
                <div className="mt-1">
                  <VerifyResultCard
                    report={messageVerifyReportsMap[message.id]}
                    language={language}
                  />
                </div>
              )}

            {/* Verify-citations + Summarize buttons — any assistant
                message with at least one citation gets both. Verify
                routes to llp-chat-verify (Claude Opus reading docs).
                Summarize routes to llp-chat-followup in mode=summarize
                (gpt-5.4) and returns plain-language summary + a
                realistic Bangladesh workplace scenario. Silent fallback
                on error for both. Verify button hidden when a Deep
                Search run already produced verdicts — the inline card
                above covers it; a second manual verify would duplicate
                both the UI and the Opus call. */}
            {showVerify && (
              <>
                <div className="flex flex-row flex-wrap items-start gap-2">
                  {/* Manual Verify Citations is admin-only surface — the
                      Opus call is expensive and the tool is mainly used
                      for moderation + audit, not end-user workflows.
                      Deep-Search inline card is also admin-only (gated
                      above). */}
                  {!message.deepSearchReport && isAdmin && (
                    <VerifyButton
                      messageId={message.id}
                      conversationId={conversationId}
                      question={priorUserQuestion}
                      answer={message.content}
                      citations={(message.citations || []).map((c) => ({
                        section: c.section,
                        document_id: c.document_id || c.document,
                        document: c.document,
                        verbatim: c.text,
                      }))}
                      language={language}
                    />
                  )}
                  {/* Premium doc-gen — shimmering amber pill. Visible for
                      all tiers (aspirational design); click branches on
                      tier: mini+ opens the builder sheet, free tiers get
                      the upgrade CTA modal. See doc 04. */}
                  <PremiumDocButton
                    question={priorUserQuestion}
                    answer={message.content}
                    citations={(message.citations || []).map((c) => ({
                      section: c.section,
                      document_id: c.document_id || c.document,
                      document: c.document,
                      verbatim: c.text,
                    }))}
                    language={language}
                    perspective="neutral"
                    preselectDocType={parseDocIntent(priorUserQuestion)}
                  />
                </div>
                {/* Summarize trigger lives in the icon row above; this
                    card renders full-width here so the amber block
                    isn't constrained by the verify pill's flex row. */}
                <SummarizeCardMount
                  messageId={message.id}
                  question={priorUserQuestion}
                  answer={message.content_en || message.content}
                  citations={(message.citations || []).map((c) => ({
                    section: c.section,
                    document_id: c.document_id || c.document,
                    document: c.document,
                    verbatim: c.text,
                  }))}
                  language={language}
                />
              </>
            )}
          </>
        )}
      </div>

      {message.sender === "user" && (
        <div className="shrink-0 hidden sm:block">
          <Avatar className="size-8">
            {user?.imageUrl && (
              <AvatarImage
                src={user.imageUrl}
                alt={user.fullName || user.username || "You"}
              />
            )}
            <AvatarFallback>
              {(
                user?.firstName?.[0] ||
                user?.username?.[0] ||
                user?.primaryEmailAddress?.emailAddress?.[0] ||
                "U"
              ).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

    </div>
  );
}

// Scoped global styles — injected once per rendered chat message; browsers
// de-dup identical <style> blocks so the runtime cost is a no-op after the
// first mount.
if (typeof document !== "undefined" && !document.getElementById("chat-msg-anim-styles")) {
  const styleEl = document.createElement("style");
  styleEl.id = "chat-msg-anim-styles";
  styleEl.textContent = `
    /* ---- Shared secondary action pill (Verify / Summarize / Others) ---- */
    /* Mirrors the 'Ask about a labour law...' chip in JumpBackInCard so
       every non-primary action in the chat column speaks one language. */
    .codex-action-secondary {
      --act-rust: #b25c22;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-family: var(--font-sans), sans-serif;
      font-style: normal;
      font-weight: 400;
      font-size: 12.5px;
      color: color-mix(in oklab, hsl(var(--foreground)) 78%, transparent);
      background: color-mix(in oklab, hsl(var(--foreground)) 3%, transparent);
      border: 1px solid color-mix(in oklab, hsl(var(--foreground)) 12%, transparent);
      cursor: pointer;
      transition: background 180ms ease, border-color 180ms ease,
                  transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
                  box-shadow 180ms ease, color 180ms ease;
    }
    .dark .codex-action-secondary { --act-rust: #d38044; }
    .codex-action-secondary:hover:not(:disabled) {
      color: hsl(var(--foreground));
      background: color-mix(in oklab, var(--act-rust) 6%, transparent);
      border-color: color-mix(in oklab, var(--act-rust) 45%, transparent);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px -10px color-mix(in oklab, var(--act-rust) 55%, transparent);
    }
    .codex-action-secondary:active:not(:disabled) { transform: translateY(0) scale(0.97); }
    .codex-action-secondary:disabled { opacity: 0.55; cursor: not-allowed; }
    .codex-action-secondary .codex-action-icon {
      color: var(--act-rust);
      flex-shrink: 0;
      transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .codex-action-secondary:hover:not(:disabled) .codex-action-icon {
      transform: rotate(-8deg);
    }
    .codex-action-secondary .codex-action-verdict {
      font-family: var(--font-jetbrains), ui-monospace, monospace;
      font-style: normal;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--act-rust);
      border-left: 1px solid color-mix(in oklab, var(--act-rust) 35%, transparent);
      padding-left: 8px;
      margin-left: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .codex-action-secondary,
      .codex-action-secondary .codex-action-icon { transition: none !important; }
    }

    /* ---- Codex bubble language ---- */
    .codex-user-bubble {
      background: #edeadf;
      border: 1px solid color-mix(in oklab, hsl(var(--foreground)) 14%, transparent);
      color: hsl(var(--foreground));
      box-shadow: inset 0 1px 0 color-mix(in oklab, white 18%, transparent);
    }
    .dark .codex-user-bubble {
      background: #121112;
      border-color: rgba(237, 230, 216, 0.16);
      box-shadow: inset 0 1px 0 rgba(237, 230, 216, 0.06);
    }
    .codex-user-text {
      font-family: var(--font-fraunces), var(--font-lora), serif;
      font-weight: 500;
      font-size: 15px;
      line-height: 1.5;
      font-variation-settings: "opsz" 22, "SOFT" 80;
      color: hsl(var(--foreground));
    }

    .codex-ai-bubble {
      background: #edeadf;
      border: 1px solid rgba(29, 20, 16, 0.10);
      color: hsl(var(--foreground));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
      font-family: var(--font-sans), sans-serif;
    }
    .dark .codex-ai-bubble {
      background: #121112;
      border-color: rgba(237, 230, 216, 0.13);
      box-shadow: inset 0 1px 0 rgba(237, 230, 216, 0.06);
    }

    /* ---- Drafting (loading) bubble — light: same as final; dark: orange gradient ---- */
    .dark .codex-drafting-bubble {
      background: linear-gradient(155deg, #4a2008, #271006) !important;
      border-color: rgba(180, 100, 40, 0.32) !important;
      box-shadow: inset 0 1px 0 rgba(255, 180, 80, 0.10) !important;
      color: #ede0cc !important;
    }
    .dark .codex-drafting-bubble .drafting-section { color: #d38044 !important; }
    .dark .codex-drafting-bubble .drafting-label   { color: rgba(237, 220, 200, 0.68) !important; }
    .dark .codex-drafting-bubble .drafting-rule    { background: rgba(220, 160, 90, 0.22) !important; }
    .dark .codex-drafting-bubble .drafting-dots i  { background: #d38044 !important; }
    .dark .codex-drafting-bubble .drafting-stage-text { color: rgba(237, 220, 200, 0.85) !important; }
    .dark .codex-drafting-bubble .drafting-skel {
      background: linear-gradient(90deg,
        rgba(180, 100, 40, 0.28) 0%,
        rgba(220, 150, 60, 0.50) 50%,
        rgba(180, 100, 40, 0.28) 100%) !important;
      background-size: 200% 100% !important;
    }
    .dark .codex-drafting-bubble.ai-bubble-streaming {
      background: linear-gradient(155deg, #4a2008, #271006) !important;
      border-color: rgba(211, 128, 68, 0.45) !important;
    }

    @keyframes chatRowEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .chat-row-enter { animation: chatRowEnter 260ms cubic-bezier(0.22, 1, 0.36, 1) both; }

    /* Transform-only breath — box-shadow pulse triggered per-frame paint.
       Halo overlay handles the aura; avatar itself just scales. */
    @keyframes aiAvatarBreath {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.04); }
    }
    .ai-avatar-breathing { animation: aiAvatarBreath 1.6s ease-in-out infinite; }

    @keyframes aiAvatarHalo {
      0%, 100% { opacity: 0.35; transform: scale(1); }
      50%      { opacity: 0.75; transform: scale(1.12); }
    }
    .ai-avatar-halo {
      background: radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, hsl(var(--primary) / 0) 70%);
      animation: aiAvatarHalo 1.6s ease-in-out infinite;
      pointer-events: none;
    }

    /* Streaming content bubble — identical to finished state, no border tricks */
    .ai-bubble-streaming {
      /* inherits codex-ai-bubble background and border unchanged */
    }

    @media (prefers-reduced-motion: reduce) {
      .chat-row-enter,
      .ai-avatar-breathing,
      .ai-avatar-halo,
      .ai-bubble-streaming { animation: none !important; }
      .ai-avatar-halo { opacity: 0.4; }
    }
  `;
  document.head.appendChild(styleEl);
}
