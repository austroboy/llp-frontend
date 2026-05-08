"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChatWelcomeScreen } from "./chat-welcome-screen";
import { ChatConversationView } from "./chat-conversation-view";
import { LimitReachedModal } from "./limit-reached-modal";
import { AI_MODELS, DEFAULT_MODEL } from "@/lib/ai/models";
import { useChatStore } from "@/store/chat-store";
import type { AttachedDocument } from "./chat-input-box";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { track } from "@/lib/posthog/events";

interface ChatMainProps {
  models?: readonly { id: string; label: string; description: string; disabled?: boolean }[];
  defaultModel?: string;
}

export function ChatMain({ models, defaultModel }: ChatMainProps = {}) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel ?? DEFAULT_MODEL);
  const [attachedDoc, setAttachedDoc] = useState<AttachedDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  // Tier 5 — daily-cap modal state. Triggered by /api/chat/quota/increment
  // when the post-bump count exceeds the free-tier limit.
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitOvershoot, setLimitOvershoot] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(0);
  const resolvedModels = models ?? AI_MODELS;
  const searchParams = useSearchParams();
  const initialQuerySent = useRef(false);
  const { language } = useLanguage();

  const {
    messages,
    isLoading,
    selectedConversationId,
    conversations,
    sendMessage,
    startNewChat,
    selectConversation,
    userTier,
  } = useChatStore();

  const isConversationStarted =
    selectedConversationId !== null || messages.length > 0;

  // Upload a file and extract text. Wires the full file-upload
  // analytics chain: initiated → completed | failed. Note: extraction
  // happens server-side inside /api/upload using Gemini Vision +
  // pdf-parse + mammoth, so success here doubles as "analysis
  // completed" for compliance-issue reporting in the future. We do NOT
  // emit `file_analysis_*` here because there is no separate analyse
  // step — when the chat-proxy answer that uses this file is generated,
  // the existing chat_query_sent + chat_answer_received events already
  // cover it. See docs/posthog-analytics/build-log.md for the gap.
  const handleFileSelect = useCallback(async (file: File) => {
    const tierId = userTier ?? "free_subscribed";
    const fileType = file.type || "application/octet-stream";
    const fileSizeKb = Math.round(file.size / 1024);
    const startedAt = Date.now();
    void track("file_upload_initiated", {
      file_type: fileType,
      file_size_kb: fileSizeKb,
      user_tier_id: tierId,
    });
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        void track("file_upload_failed", {
          file_type: fileType,
          file_size_kb: fileSizeKb,
          error_reason: typeof data?.error === "string" ? data.error : `http_${res.status}`,
          user_tier_id: tierId,
        });
        return;
      }
      setAttachedDoc({ fileName: data.fileName, text: data.text });
      // Synthetic file_id — the upload route does not return one.
      // Pair filename with timestamp so the same file uploaded twice
      // gets two distinct ids without breaking aggregation.
      const fileId = `upload-${startedAt.toString(36)}-${(data.fileName ?? "file").slice(0, 24)}`;
      void track("file_upload_completed", {
        file_id: fileId,
        file_type: fileType,
        file_size_kb: fileSizeKb,
        upload_time_ms: Date.now() - startedAt,
      });
    } catch (err) {
      toast.error("Upload failed. Please try again.");
      void track("file_upload_failed", {
        file_type: fileType,
        file_size_kb: fileSizeKb,
        error_reason: err instanceof Error ? err.message : "network_error",
        user_tier_id: tierId,
      });
    } finally {
      setIsUploading(false);
    }
  }, [userTier]);

  const handleRemoveAttachment = useCallback(() => {
    setAttachedDoc(null);
  }, []);

  /**
   * Tier 5 — increment the server-side daily counter and return true if
   * the user is at/over the cap. Failures fall through (returns false)
   * so the chat send is never blocked by analytics infra. The 429 path
   * in chat-store remains the defence-in-depth fallback.
   */
  const incrementQuotaAndCheckCap = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/chat/quota/increment", { method: "POST" });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        count?: number;
        limit?: number;
      };
      const count = typeof data.count === "number" ? data.count : 0;
      const limit = typeof data.limit === "number" ? data.limit : Number.POSITIVE_INFINITY;
      if (count > limit && Number.isFinite(limit)) {
        setLimitOvershoot(Math.max(1, count - limit));
        setDailyLimit(limit);
        setLimitModalOpen(true);
        return true;
      }
    } catch {
      // Network or JSON failure — silently allow the send. The 429
      // server-side guard catches the case where someone bypassed us.
    }
    return false;
  }, []);

  const handleSend = async (overrideText?: string | unknown) => {
    const text = typeof overrideText === "string" ? overrideText : message;
    if (!text.trim() || isLoading || cooldown) return;
    setMessage("");
    // Prepend document context if a file is attached
    const messageWithDoc = attachedDoc
      ? `[User uploaded: ${attachedDoc.fileName}]\n---\n${attachedDoc.text}\n---\n\n${text}`
      : text;
    setAttachedDoc(null);
    void track("chat_query_sent", { lang: language, role: "general", length: text.length });
    // Tier 5 — bump the daily counter; abort the send if the cap is
    // already hit so the modal is the only surface the user sees.
    const capped = await incrementQuotaAndCheckCap();
    if (capped) return;
    sendMessage(messageWithDoc, selectedModel);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
  };

  // Auto-send query from URL ?q= parameter (e.g., from homepage search)
  useEffect(() => {
    if (initialQuerySent.current) return;
    const q = searchParams.get("q");
    if (q && q.trim() && !isLoading && !isConversationStarted) {
      initialQuerySent.current = true;
      handleSend(q.trim());
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link from /dashboard/saved — load the conversation, then scroll
  // and flash-highlight the saved message once the DOM has caught up.
  const deepLinkHandled = useRef<string | null>(null);
  useEffect(() => {
    const convId = searchParams.get("conv");
    const msgId = searchParams.get("msg");
    if (!convId) return;
    const key = `${convId}:${msgId ?? ""}`;
    if (deepLinkHandled.current === key) return;
    deepLinkHandled.current = key;
    if (selectedConversationId !== convId) {
      void selectConversation(convId);
    }
  }, [searchParams, selectedConversationId, selectConversation]);

  // Scroll + highlight the target message once it renders in the DOM.
  useEffect(() => {
    const convId = searchParams.get("conv");
    const msgId = searchParams.get("msg");
    if (!convId || !msgId) return;
    if (selectedConversationId !== convId) return;
    if (isLoading) return;
    const found = messages.some((m) => m.id === msgId);
    if (!found) return;
    let cancelled = false;
    const attempt = (tries: number) => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(
        `[data-message-id="${msgId}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("saved-deeplink-flash");
        window.setTimeout(() => {
          el.classList.remove("saved-deeplink-flash");
        }, 2400);
        return;
      }
      if (tries > 0) window.setTimeout(() => attempt(tries - 1), 120);
    };
    attempt(10);
    return () => {
      cancelled = true;
    };
  }, [searchParams, selectedConversationId, messages, isLoading]);

  const handleSuggestionClick = (text: string) => {
    handleSend(text);
  };

  const handleReset = () => {
    startNewChat();
    setMessage("");
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || cooldown) return;
    setMessage("");
    // Prepend document context if a file is attached
    const messageWithDoc = attachedDoc
      ? `[User uploaded: ${attachedDoc.fileName}]\n---\n${attachedDoc.text}\n---\n\n${content}`
      : content;
    setAttachedDoc(null);
    void track("chat_query_sent", { lang: language, role: "general", length: content.length });
    // Turn-2+ followup tracking. handleSendMessage is the
    // ChatConversationView send-path, so it only fires once a
    // conversation has at least one prior user message. Depth = count
    // of prior user turns (so the very first follow-up is depth=1).
    const priorUserTurns = messages.filter((m) => m.role === "user").length;
    if (priorUserTurns >= 1) {
      const lastAssistantId =
        [...messages].reverse().find((m) => m.role === "assistant")?.id ?? "";
      void track("follow_up_query_submitted", {
        parent_query_id: lastAssistantId,
        follow_up_depth_number: priorUserTurns,
      });
    }
    // Tier 5 — daily-cap bump. See handleSend for rationale.
    const capped = await incrementQuotaAndCheckCap();
    if (capped) return;
    sendMessage(messageWithDoc, selectedModel);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
  };

  // Loading previous conversation — show skeleton
  if (selectedConversationId && messages.length === 0 && isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="max-w-[820px] mx-auto space-y-6">
            <div className="flex justify-end mb-2">
              <div className="codex-skel-avatar size-8 rounded-full" />
            </div>
            {/* User message skeleton */}
            <div className="flex gap-4 justify-end">
              <div className="codex-skel-bubble rounded-[18px] px-4 py-3 w-3/4">
                <div className="codex-skel-bar h-4 rounded mb-2" />
                <div className="codex-skel-bar h-4 rounded w-2/3" />
              </div>
            </div>
            {/* AI message skeleton */}
            <div className="flex gap-4 justify-start">
              <div className="codex-skel-avatar size-8 rounded-full shrink-0" />
              <div className="codex-skel-bubble rounded-[18px] px-5 py-4 w-full space-y-3">
                <div className="codex-skel-bar h-4 rounded" />
                <div className="codex-skel-bar h-4 rounded w-5/6" />
                <div className="codex-skel-bar h-4 rounded w-4/6" />
                <div className="codex-skel-bar h-4 rounded w-3/4" />
              </div>
            </div>
            {/* Second pair */}
            <div className="flex gap-4 justify-end">
              <div className="codex-skel-bubble rounded-[18px] px-4 py-3 w-1/2">
                <div className="codex-skel-bar h-4 rounded" />
              </div>
            </div>
            <div className="flex gap-4 justify-start">
              <div className="codex-skel-avatar size-8 rounded-full shrink-0" />
              <div className="codex-skel-bubble rounded-[18px] px-5 py-4 w-full space-y-3">
                <div className="codex-skel-bar h-4 rounded" />
                <div className="codex-skel-bar h-4 rounded w-4/5" />
                <div className="codex-skel-bar h-4 rounded w-3/5" />
              </div>
            </div>
          </div>
        </div>
        <style>{`
          .codex-skel-bubble {
            background: #edeadf;
            border: 1px solid rgba(29, 20, 16, 0.10);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
          }
          .dark .codex-skel-bubble {
            background: #121112;
            border-color: rgba(237, 230, 216, 0.13);
            box-shadow: inset 0 1px 0 rgba(237, 230, 216, 0.06);
          }
          .codex-skel-avatar {
            background: #edeadf;
            border: 1px solid rgba(29, 20, 16, 0.10);
            animation: codexSkelPulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          .dark .codex-skel-avatar {
            background: #121112;
            border-color: rgba(237, 230, 216, 0.13);
          }
          .codex-skel-bar {
            background: rgba(29, 20, 16, 0.08);
            animation: codexSkelPulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          .dark .codex-skel-bar {
            background: rgba(237, 230, 216, 0.10);
          }
          /* Stagger so rows don't pulse in lockstep — feels less mechanical. */
          .codex-skel-bubble > .codex-skel-bar:nth-child(2) { animation-delay: 120ms; }
          .codex-skel-bubble > .codex-skel-bar:nth-child(3) { animation-delay: 240ms; }
          .codex-skel-bubble > .codex-skel-bar:nth-child(4) { animation-delay: 360ms; }

          @keyframes codexSkelPulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.55; }
          }
          @media (prefers-reduced-motion: reduce) {
            .codex-skel-avatar,
            .codex-skel-bar { animation: none; }
          }
        `}</style>
      </div>
    );
  }

  // Shared limit-reached modal mount — renders alongside any active view
  // so the cap-hit surface is consistent across welcome / conversation.
  const limitModal = (
    <LimitReachedModal
      open={limitModalOpen}
      tierId={userTier ?? "free_subscribed"}
      attemptsAfterLimit={limitOvershoot}
      dailyLimit={dailyLimit}
      onClose={() => setLimitModalOpen(false)}
    />
  );

  if (isConversationStarted) {
    return (
      <>
      <ChatConversationView
        messages={messages.map((m) => ({
          id: m.id,
          content: m.content,
          content_en: m.content_en,
          sender: m.role === "user" ? ("user" as const) : ("ai" as const),
          timestamp: new Date(m.created_at),
          citations: m.citations ?? undefined,
          followups: m.followups ?? null,
          citationsAudit:
            m.citationsAudit ??
            (m as { citations_audit?: typeof m.citationsAudit }).citations_audit,
          expertSuggestions:
            m.expertSuggestions ??
            (m as { expert_suggestions?: typeof m.expertSuggestions }).expert_suggestions,
          matchedServices:
            m.matchedServices ??
            (m as { matched_services?: typeof m.matchedServices }).matched_services,
          cta: m.cta ?? (m as { cta?: typeof m.cta }).cta,
          isStreaming: m.isStreaming,
          thinking: m.thinking,
          isThinking: m.isThinking,
          toolCalls: m.toolCalls,
          clarifyOptions: m.clarifyOptions ?? (m as { clarify_options?: typeof m.clarifyOptions }).clarify_options,
          clarifyReason: m.clarifyReason ?? (m as { clarify_reason?: string | null }).clarify_reason ?? undefined,
          delegationStatus: m.delegationStatus ?? (m as { delegation_status?: typeof m.delegationStatus }).delegation_status,
          deepSearchReport: m.deepSearchReport ?? (m as { deep_search_report?: boolean }).deep_search_report,
        }))}
        message={message}
        onMessageChange={setMessage}
        onSend={handleSendMessage}
        onReset={handleReset}
        isLoading={isLoading}
        cooldown={cooldown}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        conversationId={selectedConversationId}
        conversationTitle={conversations.find((c) => c.id === selectedConversationId)?.title}
        models={resolvedModels}
        attachedDoc={attachedDoc}
        isUploading={isUploading}
        onFileSelect={handleFileSelect}
        onRemoveAttachment={handleRemoveAttachment}
      />
      {limitModal}
      </>
    );
  }

  return (
    <>
      <ChatWelcomeScreen
        message={message}
        onMessageChange={setMessage}
        onSend={handleSend}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onSuggestionClick={handleSuggestionClick}
        models={resolvedModels}
        attachedDoc={attachedDoc}
        isUploading={isUploading}
        onFileSelect={handleFileSelect}
        onRemoveAttachment={handleRemoveAttachment}
      />
      {limitModal}
    </>
  );
}
