import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { LegendList, type LegendListRef } from "@legendapp/list/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { XIcon, PaperclipIcon, LoaderIcon, SparklesIcon, SendIcon, GlobeIcon, FileTextIcon, TelescopeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "./chat-message";
import { ChatLanguagePill } from "./chat-language-pill";
import { ServiceRequestDialog } from "@/components/services/service-request-dialog";
import { useLanguage } from "@/hooks/use-language";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatStore, type Message as StoreMessage } from "@/store/chat-store";
import { AI_MODELS } from "@/lib/ai/models";
import { Logo } from "@/components/ui/logo";
import type { AttachedDocument } from "./chat-input-box";
import { WorkspaceLayout } from "./workspace-layout";
import { FilesSidebar } from "./files-sidebar";
import { SlashCommandMenu, filterSlashCommands, DEFAULT_SLASH_COMMANDS, type SlashCommand } from "./slash-command-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  sender: "user" | "ai";
  timestamp: Date;
  citations?: { document_id?: string; document: string; section: string; text: string }[];
  followups?: string[] | null;
  citationsAudit?: CitationsAudit;
  expertSuggestions?: Array<{
    id: string;
    name: string;
    slug: string;
    designation: string;
    initials: string;
    topSkill: string;
    rating: number;
  }>;
  matchedServices?: Array<{
    _id: string;
    title: string;
    titleBn?: string;
    category: string;
    description: string;
    price?: string;
    deliveryTimeline?: string;
    workflow?: string;
    paymentTerms?: string;
    notes?: string;
  }>;
  cta?: { text: string; targetTier: string | null } | null;
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
  /** Turn-1 disambiguation cards — see chat-message.tsx. */
  clarifyOptions?: Array<{
    title: string;
    role: string;
    blurb: string;
    scenario_query: string;
  }>;
  clarifyReason?: string;
  /** Phase A team-lead → verify delegation state. See chat-store.ts. */
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
}

const ACCEPTED_FILE_TYPES =
  ".pdf,.png,.jpg,.jpeg,.docx,.txt,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface ChatConversationViewProps {
  messages: Message[];
  message: string;
  onMessageChange: (value: string) => void;
  onSend: (content: string) => void;
  onReset: () => void;
  isLoading?: boolean;
  cooldown?: boolean;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  conversationId?: string | null;
  conversationTitle?: string;
  models?: readonly { id: string; label: string; description: string; disabled?: boolean }[];
  attachedDoc: AttachedDocument | null;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
  onRemoveAttachment: () => void;
}

export function ChatConversationView({
  messages,
  message,
  onMessageChange,
  onSend,
  onReset,
  isLoading,
  cooldown,
  selectedModel,
  onModelChange,
  conversationId,
  conversationTitle,
  models,
  attachedDoc,
  isUploading,
  onFileSelect,
  onRemoveAttachment,
}: ChatConversationViewProps) {
  const resolvedModels = models ?? AI_MODELS;
  const { language, t, setLanguage } = useLanguage();
  const isMobile = useIsMobile();
  const storeMessages = useChatStore((s) => s.messages);
  const userTier = useChatStore((s) => s.userTier);
  const dailyRemaining = useChatStore((s) => s.dailyRemaining);
  // Input-gating per doc 03 — once the latest AI answer is paired with
  // chips, the textarea locks until the user clicks a chip or "Others".
  const inputGatedByChips = useChatStore((s) => s.inputGatedByChips);
  const deepSearchEnabled = useChatStore((s) => s.deepSearchEnabled);
  const toggleDeepSearch = useChatStore((s) => s.toggleDeepSearch);
  // Deep Search only routes turn-2+ requests through the deep-search path;
  // on turn-1 the flag is ignored. Disable the toggle until at least one
  // assistant message has prose, so the affordance matches the behavior.
  const hasPriorAssistantTurn = useChatStore((s) =>
    s.messages.some(
      (m) =>
        m.role === "assistant" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
  );
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [selectedServiceForDialog, setSelectedServiceForDialog] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slash-command palette state
  const [slashActiveIdx, setSlashActiveIdx] = useState(0);
  const slashQuery = message.trimStart().startsWith("/") ? message.trimStart() : "";
  const slashFiltered = useMemo(
    () => (slashQuery ? filterSlashCommands(slashQuery, DEFAULT_SLASH_COMMANDS) : []),
    [slashQuery],
  );
  const slashOpen = slashQuery.length > 0 && slashFiltered.length > 0 && !inputGatedByChips;

  // Clamp active index when filter changes
  useEffect(() => {
    if (slashActiveIdx >= slashFiltered.length) setSlashActiveIdx(0);
  }, [slashFiltered.length, slashActiveIdx]);

  const runSlashCommand = useCallback(
    (cmd: SlashCommand) => {
      const lastAi = [...storeMessages].reverse().find((m) => m.role === "assistant")?.content ?? null;
      const ctx = {
        onReset,
        setLanguage,
        lastAiContent: lastAi,
        sendMessage: (c: string) => onSend(c),
        close: () => setSlashActiveIdx(0),
        clear: () => onMessageChange(""),
      };
      if (cmd.template) {
        onMessageChange("");
        onSend(cmd.template);
        setSlashActiveIdx(0);
        return;
      }
      if (cmd.action) {
        cmd.action(ctx);
      }
    },
    [storeMessages, onReset, setLanguage, onSend, onMessageChange],
  );

  // Progress stage indicator — timer-based stages while AI is loading
  const LOADING_STAGES = useMemo(() => [
    "Searching legal database...",
    "Analyzing relevant sections...",
    "Generating response...",
  ], []);
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(0);
      return;
    }
    const t1 = setTimeout(() => setLoadingStage(1), 3000);
    const t2 = setTimeout(() => setLoadingStage(2), 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_SIZE) {
      alert("File too large (max 10 MB)");
      return;
    }
    onFileSelect(file);
  };

  const handleSuggestionClick = useCallback((text: string) => {
    onSend(text);
  }, [onSend]);

  const handleFocusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const handleServiceRequest = (category: string) => {
    // Find the matching service from any message's matchedServices
    for (const msg of storeMessages) {
      if (msg.matchedServices?.length) {
        const service = msg.matchedServices.find((s) => s.category === category);
        if (service) {
          setSelectedServiceForDialog(service);
          setServiceDialogOpen(true);
          return;
        }
      }
    }
  };

  // LegendList owns scroll anchoring — maintainScrollAtEnd keeps view pinned
  // to latest message when already near bottom. No manual scrollIntoView needed.
  const listRef = useRef<LegendListRef>(null);

  type TimelineRow =
    | { kind: "message"; msg: Message; idx: number; isLast: boolean }
    | { kind: "loader" };

  const showLoaderRow =
    !!isLoading &&
    !messages.some((m) => m.sender === "ai" && (m.isStreaming || (m.content && m.content.length > 0)));

  const timelineRows = useMemo<TimelineRow[]>(() => {
    const rows: TimelineRow[] = messages
      .filter((m) => !(isLoading && m.sender === "ai" && !m.content && !m.isStreaming))
      .map((msg, idx, arr) => ({ kind: "message" as const, msg, idx, isLast: idx === arr.length - 1 }));
    if (showLoaderRow) rows.push({ kind: "loader" });
    return rows;
  }, [messages, isLoading, showLoaderRow]);

  const keyExtractor = useCallback(
    (item: TimelineRow) => (item.kind === "message" ? item.msg.id : "__loader__"),
    [],
  );

  const renderRow = useCallback(
    ({ item }: { item: TimelineRow }) => {
      if (item.kind === "loader") {
        return (
          <div className="max-w-[820px] mx-auto px-4 md:px-8">
            <div className="flex gap-4 justify-start chat-row-enter">
              <div className="shrink-0 hidden sm:block">
                <div className="size-8 rounded-full bg-secondary flex items-center justify-center relative ai-avatar-breathing">
                  <Logo className="size-6" />
                  <span aria-hidden="true" className="ai-avatar-halo absolute inset-0 rounded-full" />
                </div>
              </div>
              <div className="relative rounded-2xl px-5 py-4 bg-secondary space-y-3 max-w-md overflow-hidden loader-card-pulse">
                {/* Rotating gradient ring spinner */}
                <div className="flex items-center gap-2.5">
                  <span className="gradient-ring size-4 shrink-0" aria-hidden="true" />
                  <span key={loadingStage} className="text-sm font-medium stage-text-swap">
                    {LOADING_STAGES[loadingStage]}
                  </span>
                  <span className="typing-dots ml-0.5" aria-hidden="true">
                    <i></i><i></i><i></i>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Reviewing Bangladesh labour law provisions, amendments, and rules. This typically takes 10–20 seconds.
                </p>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #22c55e, #3b82f6, #a855f7, #f59e0b)",
                      backgroundSize: "300% 100%",
                      animation:
                        "progress 15s ease-in-out forwards, colorShift 3s ease-in-out infinite",
                    }}
                  />
                </div>
                {/* Sheen that sweeps across the card */}
                <span aria-hidden="true" className="loader-sheen" />
                <style>{`
                  @keyframes progress { 0% { width: 5%; } 30% { width: 40%; } 60% { width: 70%; } 80% { width: 85%; } 100% { width: 95%; } }
                  @keyframes colorShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

                  @keyframes stageTextSwap { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                  .stage-text-swap { animation: stageTextSwap 260ms cubic-bezier(0.22, 1, 0.36, 1) both; }

                  @keyframes gradientRingSpin { to { transform: rotate(360deg); } }
                  .gradient-ring {
                    border-radius: 9999px;
                    background: conic-gradient(from 0deg, hsl(var(--primary) / 0), hsl(var(--primary) / 0.9), hsl(var(--primary) / 0));
                    -webkit-mask: radial-gradient(circle, transparent 54%, black 56%);
                            mask: radial-gradient(circle, transparent 54%, black 56%);
                    animation: gradientRingSpin 1.1s linear infinite;
                  }

                  .typing-dots { display: inline-flex; gap: 3px; }
                  .typing-dots i {
                    width: 4px; height: 4px; border-radius: 9999px;
                    background: hsl(var(--primary) / 0.85);
                    display: inline-block;
                    animation: typingDot 1.2s ease-in-out infinite;
                  }
                  .typing-dots i:nth-child(2) { animation-delay: 0.18s; }
                  .typing-dots i:nth-child(3) { animation-delay: 0.36s; }
                  @keyframes typingDot {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30%           { transform: translateY(-3px); opacity: 1; }
                  }

                  @keyframes loaderPulse {
                    0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
                    50%      { box-shadow: 0 0 0 3px hsl(var(--primary) / 0.06); }
                  }
                  .loader-card-pulse { animation: loaderPulse 2.4s ease-in-out infinite; }

                  @keyframes loaderSheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
                  .loader-sheen {
                    position: absolute;
                    top: 0; bottom: 0; left: 0;
                    width: 60%;
                    pointer-events: none;
                    background: linear-gradient(100deg, transparent 0%, hsl(var(--primary) / 0) 20%, hsl(var(--primary) / 0.08) 50%, hsl(var(--primary) / 0) 80%, transparent 100%);
                    animation: loaderSheen 2.8s ease-in-out infinite;
                    filter: blur(2px);
                  }

                  @media (prefers-reduced-motion: reduce) {
                    .stage-text-swap,
                    .gradient-ring,
                    .typing-dots i,
                    .loader-card-pulse,
                    .loader-sheen { animation: none !important; }
                    .loader-sheen { display: none; }
                    .typing-dots i { opacity: 0.8; }
                  }
                `}</style>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="max-w-[820px] mx-auto px-4 md:px-8 py-3">
          <ChatMessage
            message={item.msg}
            conversationId={conversationId || undefined}
            conversationTitle={conversationTitle}
            onServiceRequest={handleServiceRequest}
            onSuggestionClick={handleSuggestionClick}
            onFocusInput={handleFocusInput}
            isLastMessage={item.isLast}
          />
        </div>
      );
    },
    [LOADING_STAGES, loadingStage, conversationId, conversationTitle, handleServiceRequest, handleSuggestionClick, handleFocusInput],
  );

  return (
    <WorkspaceLayout
      language={language}
      filesSidebar={<FilesSidebar language={language} />}
    >
    <div className="flex h-full flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 md:px-8 pt-4 pb-2 max-w-[820px] mx-auto w-full">
        <div className="flex items-center min-w-0">
          {dailyRemaining !== null && (
            <span
              className={cn(
                "codex-quota inline-flex h-8 items-center rounded-full px-3 truncate",
                dailyRemaining <= 0
                  ? "codex-quota--empty"
                  : dailyRemaining <= 3
                    ? "codex-quota--low"
                    : null
              )}
            >
              {dailyRemaining <= 0 ? (
                <span className="text-[11px] font-medium tracking-[0.02em]">
                  {userTier === "free_guest" ? "Sign up to continue" : "Daily limit reached"}
                </span>
              ) : (
                <span className="text-[11px] font-medium tracking-[0.02em]">
                  Remaining: <span className="codex-quota__count font-semibold">{dailyRemaining}</span> Chat{dailyRemaining !== 1 ? "s" : ""}
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {conversationId && <ChatLanguagePill />}
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={onReset}
            className="size-8 rounded-full border"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>
      <LegendList<TimelineRow>
        ref={listRef}
        data={timelineRows}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        estimatedItemSize={180}
        initialScrollAtEnd
        maintainScrollAtEnd
        maintainScrollAtEndThreshold={0.1}
        maintainVisibleContentPosition
        className="codex-scroll flex-1 overflow-y-auto overscroll-y-contain pb-8"
        ListHeaderComponent={<div className="h-2" />}
        ListFooterComponent={<div className="h-6" />}
      />

      <ServiceRequestDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        service={selectedServiceForDialog}
      />

      <div className="codex-conv-footer px-4 md:px-8 py-[17px]">
        <div className="max-w-[820px] mx-auto">
          <div className="codex-conv-frame rounded-[18px] p-1.5">
            <div className="codex-conv-inner rounded-[14px] flex flex-wrap items-end gap-2 px-2.5 py-2">
              {/* Attached document badge */}
              {(attachedDoc || isUploading) && (
                <div className="px-4 pt-3 pb-1">
                  {isUploading ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <LoaderIcon className="size-3 animate-spin" />
                      Analyzing document...
                    </span>
                  ) : attachedDoc ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <FileTextIcon className="size-3" />
                      {attachedDoc.fileName}
                      <button
                        type="button"
                        onClick={onRemoveAttachment}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                        aria-label="Remove attachment"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </span>
                  ) : null}
                </div>
              )}

              <button
                type="button"
                className="codex-conv-tool codex-conv-tool--lead inline-flex size-9 shrink-0 items-center justify-center rounded-full self-center"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Attach a document (PDF, image, DOCX, TXT)"
              >
                <PaperclipIcon className="size-4" />
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="relative min-w-0 order-first basis-full sm:order-none sm:basis-auto sm:flex-1">
                <SlashCommandMenu
                  open={slashOpen}
                  query={slashQuery}
                  activeIndex={slashActiveIdx}
                  onSelect={(cmd) => runSlashCommand(cmd)}
                  onHoverIndex={(idx) => setSlashActiveIdx(idx)}
                />
                <Textarea
                  ref={textareaRef}
                  disabled={inputGatedByChips}
                  aria-disabled={inputGatedByChips}
                  aria-label={
                    inputGatedByChips
                      ? language === "bn"
                        ? "ইনপুট লক করা — একটি সাজেশন ক্লিক করুন বা 'অন্য প্রশ্ন' চাপুন"
                        : "Input locked — click a suggestion above or press 'I have a different question'"
                      : undefined
                  }
                  placeholder={
                    inputGatedByChips
                      ? isMobile
                        ? language === "bn"
                          ? "সাজেশন বাছুন বা 'অন্য প্রশ্ন'"
                          : "Pick a suggestion or 'Different question'"
                        : language === "bn"
                          ? "উপরে একটি সাজেশন ক্লিক করুন বা 'অন্য প্রশ্ন' চাপুন"
                          : "Click a suggestion above or press 'I have a different question' to type your own"
                      : t("input.placeholder.continue")
                  }
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  className={cn(
                    "min-h-[44px] max-h-[160px] resize-none border-0 bg-transparent px-2 py-2 text-[15px] placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 codex-conv-textarea",
                    inputGatedByChips && "opacity-50 cursor-not-allowed"
                  )}
                  onKeyDown={(e) => {
                    if (slashOpen) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSlashActiveIdx((i) => (i + 1) % slashFiltered.length);
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSlashActiveIdx((i) => (i - 1 + slashFiltered.length) % slashFiltered.length);
                        return;
                      }
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        const cmd = slashFiltered[slashActiveIdx];
                        if (cmd) runSlashCommand(cmd);
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        onMessageChange("");
                        return;
                      }
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (message.trim() && !isLoading && !cooldown && !inputGatedByChips) {
                        onSend(message);
                      }
                    }
                  }}
                />
              </div>

              {/* Deep Search toggle — turn-2+ only; flips /api/chat
                  onto the retrieve → draft → verify-gate pipeline.
                  Disabled on turn-1 because the backend ignores the
                  flag there (Grok already retrieves fresh on turn-1). */}
              <button
                type="button"
                onClick={toggleDeepSearch}
                disabled={!hasPriorAssistantTurn}
                aria-pressed={deepSearchEnabled}
                aria-disabled={!hasPriorAssistantTurn}
                aria-label="Deep Search"
                className={cn(
                  "codex-conv-tool inline-flex items-center justify-center gap-1.5 h-9 shrink-0 rounded-full w-9 sm:w-auto sm:px-3 self-center",
                  deepSearchEnabled && hasPriorAssistantTurn && "codex-conv-tool--active"
                )}
                title={
                  !hasPriorAssistantTurn
                    ? "Deep Search available from turn 2 onwards — your first answer already runs full retrieval."
                    : deepSearchEnabled
                      ? "Deep Search on — verified against source before emit (slower, higher accuracy)"
                      : "Deep Search off — turn on to verify follow-up answers against the corpus"
                }
              >
                <TelescopeIcon className="size-3.5" />
                <span className="hidden sm:inline text-[11px] tracking-[0.12em] uppercase">
                  Deep
                </span>
              </button>

              <button
                type="button"
                disabled={isLoading || cooldown || !message.trim() || inputGatedByChips}
                onClick={() => {
                  if (message.trim() && !inputGatedByChips) {
                    onSend(message);
                  }
                }}
                className={cn(
                  "codex-conv-send inline-flex h-9 w-9 sm:w-auto items-center justify-center gap-2 rounded-full ml-auto sm:ml-0 sm:pl-4 sm:pr-3 text-[11px] font-semibold uppercase tracking-[0.22em] self-center",
                  (isLoading || cooldown || !message.trim() || inputGatedByChips) && "codex-conv-send--idle"
                )}
                aria-label="Ask"
              >
                <span className="hidden sm:inline">Ask</span>
                <span className="codex-conv-send-icon inline-flex size-5 items-center justify-center rounded-full">
                  {isLoading ? (
                    <LoaderIcon className="size-3 animate-spin" />
                  ) : (
                    <SendIcon className="size-3" />
                  )}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
      <style>{conversationStyles}</style>
    </div>
    </WorkspaceLayout>
  );
}

const conversationStyles = `
  .codex-conv-footer {
    border-top: 1px solid color-mix(in oklab, hsl(var(--foreground)) 10%, transparent);
    background: color-mix(in oklab, hsl(var(--background)) 92%, hsl(var(--foreground)) 8%);
    backdrop-filter: blur(8px);
  }
  .codex-conv-frame {
    background: linear-gradient(180deg, #ece6d6 0%, #e2ddd0 100%);
    border: 1px solid rgba(90, 60, 30, 0.18);
    box-shadow:
      inset 0 1px 0 rgba(255, 252, 245, 0.55),
      0 6px 22px -12px rgba(60, 40, 20, 0.18);
  }
  .dark .codex-conv-frame {
    background: linear-gradient(180deg, #231c16 0%, #1a1410 100%);
    border-color: rgba(237, 230, 216, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(237, 230, 216, 0.05),
      0 10px 28px -14px rgba(0, 0, 0, 0.6);
  }
  .codex-conv-inner {
    background: transparent;
  }
  .codex-conv-tool {
    color: rgba(60, 40, 20, 0.75);
    background: rgba(255, 252, 245, 0.50);
    border: 1px solid rgba(90, 60, 30, 0.20);
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    cursor: pointer;
    transition: color 180ms ease, background 180ms ease, border-color 180ms ease,
                transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .codex-conv-tool:hover {
    color: #3a2512;
    background: rgba(255, 245, 225, 0.55);
    border-color: rgba(90, 60, 30, 0.35);
  }
  .codex-conv-tool:active:not(:disabled) { transform: scale(0.95); }
  .dark .codex-conv-tool {
    color: rgba(237, 230, 216, 0.68);
    background: rgba(237, 230, 216, 0.03);
    border-color: rgba(237, 230, 216, 0.12);
  }
  .dark .codex-conv-tool:hover {
    color: rgba(237, 230, 216, 0.95);
    background: rgba(237, 230, 216, 0.07);
    border-color: rgba(237, 230, 216, 0.2);
  }
  .codex-conv-tool:disabled { opacity: 0.45; cursor: not-allowed; }
  .codex-conv-tool--active {
    color: #fff8ea !important;
    background: rgba(181, 93, 24, 0.92) !important;
    border-color: rgba(181, 93, 24, 0.95) !important;
  }
  .codex-conv-tool--active:hover {
    color: #fff8ea !important;
    background: rgba(181, 93, 24, 1) !important;
    border-color: rgba(181, 93, 24, 1) !important;
  }
  .dark .codex-conv-tool--active {
    color: #fff1dc !important;
    background: rgba(216, 124, 46, 0.88) !important;
    border-color: rgba(216, 124, 46, 0.95) !important;
  }

  .codex-conv-textarea { color: #2a1f15; }
  .codex-conv-textarea::placeholder { color: rgba(60, 40, 20, 0.5); font-style: italic; }
  .dark .codex-conv-textarea { color: #ede6d8; }
  .dark .codex-conv-textarea::placeholder { color: rgba(237, 230, 216, 0.45); }

  .codex-conv-send {
    --send-rust: #b25c22;
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    color: #1d1410;
    background: linear-gradient(180deg,
      color-mix(in oklab, var(--send-rust) 88%, white) 0%,
      color-mix(in oklab, var(--send-rust) 100%, black 14%) 100%);
    border: 1px solid var(--send-rust);
    box-shadow:
      inset 0 1px 0 color-mix(in oklab, white 40%, transparent),
      0 8px 22px -10px color-mix(in oklab, var(--send-rust) 50%, transparent);
    cursor: pointer;
    transition: filter 160ms ease, transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
                box-shadow 180ms ease;
  }
  .dark .codex-conv-send {
    background: linear-gradient(180deg, #d68042 0%, #aa5820 100%);
    border-color: #c06830;
    color: #f5e8d5;
    box-shadow:
      inset 0 1px 0 rgba(255, 210, 150, 0.22),
      0 8px 22px -10px rgba(200, 100, 30, 0.55);
  }
  .codex-conv-send:hover:not(:disabled) { filter: brightness(1.05); }
  .codex-conv-send:hover:not(:disabled) .codex-conv-send-icon { transform: translateX(2px) rotate(-8deg); }
  .codex-conv-send:active:not(:disabled) { transform: scale(0.97); }
  .codex-conv-send-icon {
    background: color-mix(in oklab, #140c06 18%, transparent);
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .dark .codex-conv-send-icon {
    background: rgba(245, 232, 213, 0.12);
  }
  .codex-conv-send--idle {
    background: color-mix(in oklab, hsl(var(--foreground)) 6%, transparent) !important;
    color: color-mix(in oklab, hsl(var(--foreground)) 40%, transparent);
    border-color: color-mix(in oklab, hsl(var(--foreground)) 14%, transparent);
    box-shadow: none;
    cursor: not-allowed;
  }
  .codex-conv-send--idle .codex-conv-send-icon {
    background: color-mix(in oklab, hsl(var(--foreground)) 8%, transparent);
  }

  /* Quota pill — top bar. Codex ledger tone, mono font, echoes the
     language pill + tool buttons so header reads as one kit. */
  .codex-quota {
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    color: rgba(60, 40, 20, 0.82);
    background: rgba(255, 252, 245, 0.55);
    border: 1px solid rgba(90, 60, 30, 0.22);
    box-shadow: inset 0 1px 0 rgba(255, 252, 245, 0.55);
    transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
  }
  .dark .codex-quota {
    color: rgba(237, 230, 216, 0.78);
    background: rgba(237, 230, 216, 0.04);
    border-color: rgba(237, 230, 216, 0.14);
    box-shadow: inset 0 1px 0 rgba(237, 230, 216, 0.05);
  }
  .codex-quota__count {
    color: #b25c22;
    font-weight: 600;
  }
  .dark .codex-quota__count { color: #d38044; }

  .codex-quota--low {
    color: #8a4116;
    background: rgba(181, 93, 24, 0.12);
    border-color: rgba(181, 93, 24, 0.40);
  }
  .codex-quota--low .codex-quota__count { color: #8a4116; }
  .dark .codex-quota--low {
    color: #f0b077;
    background: rgba(216, 124, 46, 0.12);
    border-color: rgba(216, 124, 46, 0.40);
  }
  .dark .codex-quota--low .codex-quota__count { color: #ffc58a; }

  .codex-quota--empty {
    color: #8d2a2a;
    background: rgba(170, 40, 40, 0.10);
    border-color: rgba(170, 40, 40, 0.40);
  }
  .dark .codex-quota--empty {
    color: #f5a4a4;
    background: rgba(220, 80, 80, 0.12);
    border-color: rgba(220, 80, 80, 0.40);
  }
`;
