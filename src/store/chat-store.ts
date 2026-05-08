import { create } from "zustand";
import {
  DEFAULT_CHAT_LANGUAGE,
  isSupportedLanguage,
} from "@/lib/languages";
import { track } from "@/lib/posthog/events";
import type { ConfidenceBand } from "@/app/api/chat/confidence-band";

function detectLanguage(text: string): "en" | "bn" {
  const banglaChars = text.match(/[\u0980-\u09FF]/g);
  return banglaChars && banglaChars.length > text.length * 0.1 ? "bn" : "en";
}

const SESSION_LANG_LS_KEY = "llp-chat-session-language";
const DEFAULT_LANG_LS_KEY = "llp-chat-default-language";
const DEEP_SEARCH_LS_KEY = "llp-chat-deep-search";

function readInitialDeepSearch(): boolean {
  return false;
}

export function readPersistedDeepSearch(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEEP_SEARCH_LS_KEY) === "1";
}

// Always deterministic — read from localStorage only via hydrateChatLanguage()
// below, which is called from a useEffect after mount. Starting with the same
// default on server and client avoids SSR hydration mismatches.
function readInitialLanguage(): string {
  return DEFAULT_CHAT_LANGUAGE;
}

export function readPersistedChatLanguage(): string | null {
  if (typeof window === "undefined") return null;
  const session = window.localStorage.getItem(SESSION_LANG_LS_KEY);
  if (isSupportedLanguage(session)) return session as string;
  const fallback = window.localStorage.getItem(DEFAULT_LANG_LS_KEY);
  if (isSupportedLanguage(fallback)) return fallback as string;
  return null;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** English source-of-truth preserved when `content` was auto-translated
   *  during generation. NULL / undefined when the message was originally
   *  English (no translation happened). Drives the "View original English"
   *  collapsible under translated assistant messages. */
  content_en?: string | null;
  /** Rendered language code for `content` (e.g. 'en', 'bn'). */
  language?: string | null;
  originalLanguage?: "en" | "bn";
  translations?: {
    en?: string;
    bn?: string;
  };
  isTranslating?: boolean;
  citations?: { document_id?: string; document: string; section: string; text: string }[] | null;
  /** Follow-up chip questions persisted with the message. Populated on
   *  first generation by /api/chat/followup; rehydrated by
   *  /api/conversations/[id]/messages on history switch. When present,
   *  FollowupChips skips its fetch and renders these directly. */
  followups?: string[] | null;
  expertSuggestions?: Array<{
    id: string;
    name: string;
    slug: string;
    designation: string;
    initials: string;
    topSkill: string;
    rating: number;
  }>;
  cta?: {
    text: string;
    targetTier: string | null;
  } | null;
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
  citationsAudit?: {
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
  };
  tier?: string;
  created_at: string;
  isGuestLimit?: boolean; // true when guest daily limit hit — shows signup CTA
  isStreaming?: boolean; // true while NDJSON stream is delivering tokens — drives caret in MarkdownRenderer
  thinking?: string; // accumulated extended-thinking / reasoning text (shown in collapsible block above content)
  isThinking?: boolean; // true while reasoning is still streaming — drives pulse on thinking block
  toolCalls?: Array<{
    id: string;
    name: string;
    args?: unknown;
    result?: unknown;
    status: "running" | "done" | "error";
    error?: string;
  }>;
  /** Turn-1 disambiguation cards. When present, the message renders as
   *  big scenario buttons instead of a text bubble. Populated from the
   *  `clarify_options` NDJSON event the turn-1 model emits for broad
   *  queries. Clicking an option sends `scenario_query` as the next
   *  user message (routed to orchestrator GPT-5.4 for continuation). */
  clarifyOptions?: Array<{
    title: string;
    role: string;
    blurb: string;
    scenario_query: string;
  }>;
  /** Optional 1-sentence rationale for why we are clarifying
   *  (e.g. "Termination rules vary by role and type of separation").
   *  Shown above the card grid. */
  clarifyReason?: string;
  /** Phase A (2026-04-22) — turn-2+ team-lead delegation status.
   *  Emitted by chat-proxy NDJSON event `delegation_status` while the
   *  followup agent blocks on llp-chat-verify. `pending` → UI shows
   *  pulse + "Verifying §X"; `complete` → badge + section label.
   *  `error` / `timeout` surface a final state when the sub-agent fails
   *  or exceeds max_response_ms. Schema:
   *  `chat-proxy/data/delegation-status-event-schema.json`. */
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
  /** Deep Search origin marker. When true, `messageVerifyReports[id]` is
   *  a pre-computed verify report from the retrieve → draft → verify-gate
   *  pipeline. The chat-message UI renders VerifyResultCard inline under
   *  the answer bubble without requiring a Verify-button click. */
  deepSearchReport?: boolean;
  /** G1 Honesty Guard — populated by the `confidence_band` NDJSON event
   *  when verify-verdict assembly flags any citation as `not_verifiable`,
   *  `partial`, or `disagree`. Drives ConfidenceBandBanner above the AI
   *  bubble. Flag-gated server-side via ENABLE_HONESTY_GUARD; null/absent
   *  on flag-OFF turns and on turns with all-agreeing verdicts. */
  confidenceBand?: ConfidenceBand;
  /** PB Task 3 (D1) — turn-1 batch verify state machine.
   *  `in_progress` from `verify_in_progress` event; `done` after
   *  `turn1_audit`. Drives the inline verify spinner on the AI bubble
   *  while D1 runs in parallel with the user's reading window. */
  verifyState?: "in_progress" | "done";
  /** PB Task 3 (D1) — incremental verdicts streamed via
   *  `verify_progress` events, keyed by `${document_id}::${section}`.
   *  Lets the UI surface per-group verdicts as they land instead of
   *  waiting for the full `turn1_audit` aggregate. */
  verdictsByGroup?: Record<string, unknown[]>;
  /** PB Task 3 (D1) — final aggregate audit emitted as `turn1_audit`.
   *  Mirrors Turn1AuditPayload in src/lib/verify/turn1-batch.ts;
   *  unknown[] for verdicts so the store stays decoupled from the
   *  route-local DeepVerifyVerdict shape. Populated only when
   *  ENABLE_TURN1_VERIFY=1 server-side AND citations.length ≥ 2 AND
   *  intent ∉ {NOT_A_QUESTION, OUT_OF_SCOPE}. */
  turn1Audit?: {
    checked_count: number;
    draft_citation_count: number;
    verdicts: unknown[];
    duration_ms: number;
    model: string;
  };
  /** PB Task 6 (F1) — llp-chat-recover synthesis corrector applied.
   *  When true, `content` + `citations` were rewritten by F1 after E3
   *  re-fire still left D1 verdicts dirty. Drives a UI affordance that
   *  surfaces "answer was corrected" to the user (rewrite_notes is
   *  emitted alongside in the `corrector_result` event for debug). */
  correctorApplied?: boolean;
  /** F1 corrector self-rated confidence in the rewrite. */
  correctorConfidence?: "high" | "medium" | "low";
  /** F1 corrector state machine.
   *  `in_progress` from `corrector_in_progress`; `done` after
   *  `corrector_result`; `skipped` when F1 returned null and the route
   *  emitted `corrector_skipped` (fall-through to G1 on original
   *  verdicts). */
  correctorState?: "in_progress" | "done" | "skipped";
}

interface ChatState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  conversationsLoaded: boolean;

  // Framework tier info (updated on each response)
  userTier: string | null;
  dailyRemaining: number | null;
  /** Seeds userTier from Clerk publicMetadata on page mount so gated
   *  affordances (Generate Document, daily-limit banner) work before the
   *  first /api/chat response lands. Stream events still take precedence
   *  because they carry authoritative server-side tier + quota. */
  setUserTier: (tier: string | null) => void;
  /** Lightweight GET to /api/chat/quota that fills userTier + dailyRemaining
   *  before any chat turn runs. Loading a saved conversation never hits
   *  /api/chat, so without this probe the top-bar quota pill stays null. */
  fetchQuota: () => Promise<void>;

  // Response language for the active session/conversation. Drives /api/chat
  // request body and header pill. Hydrated from localStorage at boot, then
  // overridden by selected conversation's persisted language on selection.
  chatLanguage: string;
  setChatLanguage: (code: string) => void;
  /** Mid-session language switch — costs 1 quota tick + retranslates thread. */
  switchChatLanguage: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  isSwitchingLanguage: boolean;

  /** Deep Search toggle — persisted to localStorage under
   *  LLP_DEEP_SEARCH_LS_KEY. When true AND turn >= 2, /api/chat runs a
   *  retrieve → draft → verify-gate pipeline (callOrchestratorDeepSearch) and
   *  emits a deep_search_report event the UI renders inline. */
  deepSearchEnabled: boolean;
  toggleDeepSearch: () => void;

  // Configurable API URL (defaults to /api/chat)
  chatApiUrl: string;

  /**
   * Input-gating flag for the chips-flow (doc 03).
   *   true  → textarea is disabled; user must click a chip or "Others"
   *   false → textarea is enabled for free-text entry
   *
   * Transitions:
   *   • flipped to TRUE when an assistant message finishes streaming
   *     and it carries at least one citation (the chat UI then renders
   *     followup chips).
   *   • flipped to FALSE when the user clicks "Others", or when a new
   *     user message is sent, or when a new chat is started, or on
   *     conversation switch.
   */
  inputGatedByChips: boolean;
  enableFreeTextInput: () => void;

  activeReference: {
    docId: string;
    sectionAnchor: string;
    sectionLabel: string;
  } | null;

  setActiveReference: (ref: { docId: string; sectionAnchor: string; sectionLabel: string }) => void;
  clearActiveReference: () => void;
  setChatApiUrl: (url: string) => void;

  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  startNewChat: () => void;
  renameConversation: (id: string, title: string) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
  unarchiveConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, model: string) => Promise<void>;
  translateMessages: (targetLanguage: "en" | "bn") => Promise<void>;
  /** Truncate the conversation to the point just BEFORE the given user message.
   *  Removes the user message and all messages after it, so the user can retype
   *  and resend. Mirrors t3's "revert to here" checkpoint behavior. */
  revertToUserMessage: (userMessageId: string) => void;

  /** Per-message summary payload from the Summarize button. Keyed by message
   *  id so the PDF export pipeline can attach the summary to the right answer
   *  even when multiple messages have been summarized in one conversation. */
  messageSummaries: Record<string, MessageSummary>;
  setMessageSummary: (messageId: string, payload: MessageSummary) => void;

  /** Transient Summarize UI state per message. Lifted out of the component
   *  so the trigger (icon-row pill) and the card (inline below the answer)
   *  can live in different DOM locations and still share status / expanded
   *  state. Populated by `SummarizeTrigger`, read by `SummarizeCardMount`. */
  messageSummaryUi: Record<
    string,
    { status: "idle" | "loading" | "done" | "error"; expanded: boolean; errorMsg?: string }
  >;
  setMessageSummaryUi: (
    messageId: string,
    partial: Partial<{
      status: "idle" | "loading" | "done" | "error";
      expanded: boolean;
      errorMsg?: string;
    }>,
  ) => void;

  /** Per-message verify citations report from the Verify button. Same
   *  rationale as messageSummaries. */
  messageVerifyReports: Record<string, MessageVerifyReport>;
  setMessageVerifyReport: (messageId: string, payload: MessageVerifyReport) => void;

  /** Patch `delegationStatus` on an in-flight assistant message. Dispatched
   *  by the followup NDJSON consumer when chat-proxy emits a
   *  `delegation_status` event (Phase A — turn-2+ team-lead handoff). */
  setDelegationStatus: (messageId: string, status: Message["delegationStatus"]) => void;
}

export interface MessageSummary {
  summary: string;
  example_scenario?: string;
  cited_sections?: string[];
}

export interface MessageVerifyClaim {
  claim?: string;
  cited_section?: string;
  verdict?: string;
  confidence?: number;
  /** Same text as `evidence`; kept for legacy consumers (PDF renderer,
   *  citation-audit admin surface). New code should prefer `evidence`,
   *  which is what VerifyResultCard renders inline. */
  explanation?: string;
  /** Rendered by VerifyResultCard under each claim badge. For Deep
   *  Search verdicts this is the verify agent's `result_summary`. */
  evidence?: string;
}

export interface MessageVerifyReport {
  overall_verdict?: string;
  confidence?: number;
  claims?: MessageVerifyClaim[];
  superseded_sections?: string[];
  missing_citations?: string[];
  /** Narrative from the verify agent — rendered above per-claim list. */
  summary?: string;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  messages: [],
  isLoading: false,
  conversationsLoaded: false,

  userTier: null,
  dailyRemaining: null,
  setUserTier: (tier) => set({ userTier: tier }),
  fetchQuota: async () => {
    try {
      const res = await fetch("/api/chat/quota", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { tier?: string; dailyRemaining?: number };
      set((s) => ({
        userTier: data.tier ?? s.userTier,
        dailyRemaining: typeof data.dailyRemaining === "number" ? data.dailyRemaining : s.dailyRemaining,
      }));
    } catch {}
  },

  chatLanguage: readInitialLanguage(),
  isSwitchingLanguage: false,
  deepSearchEnabled: readInitialDeepSearch(),
  toggleDeepSearch: () => {
    const next = !get().deepSearchEnabled;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEEP_SEARCH_LS_KEY, next ? "1" : "0");
    }
    set({ deepSearchEnabled: next });
  },
  messageSummaries: {},
  setMessageSummary: (messageId: string, payload: MessageSummary) =>
    set((state) => ({
      messageSummaries: { ...state.messageSummaries, [messageId]: payload },
    })),
  messageSummaryUi: {},
  setMessageSummaryUi: (messageId, partial) =>
    set((state) => {
      const prev = state.messageSummaryUi[messageId] ?? {
        status: "idle" as const,
        expanded: true,
      };
      return {
        messageSummaryUi: {
          ...state.messageSummaryUi,
          [messageId]: { ...prev, ...partial },
        },
      };
    }),
  messageVerifyReports: {},
  setMessageVerifyReport: (messageId: string, payload: MessageVerifyReport) =>
    set((state) => ({
      messageVerifyReports: { ...state.messageVerifyReports, [messageId]: payload },
    })),
  setDelegationStatus: (messageId: string, status: Message["delegationStatus"]) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, delegationStatus: status } : m
      ),
    })),
  setChatLanguage: (code: string) => {
    if (!isSupportedLanguage(code)) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_LANG_LS_KEY, code);
    }
    set({ chatLanguage: code });
  },
  switchChatLanguage: async (code: string) => {
    if (!isSupportedLanguage(code)) return { ok: false, error: "Unsupported language" };
    const state = get();
    if (code === state.chatLanguage) return { ok: true };
    if (!state.selectedConversationId) {
      // No active conversation — just set locally; nothing to retranslate.
      get().setChatLanguage(code);
      return { ok: true };
    }
    set({ isSwitchingLanguage: true });
    try {
      const res = await fetch(
        `/api/conversations/${state.selectedConversationId}/switch-language`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: code }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ isSwitchingLanguage: false });
        return { ok: false, error: data.error || "Switch failed" };
      }
      const { messages: refreshed } = await res.json();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SESSION_LANG_LS_KEY, code);
      }
      set({
        chatLanguage: code,
        messages: Array.isArray(refreshed) ? refreshed : state.messages,
        isSwitchingLanguage: false,
      });
      return { ok: true };
    } catch (err) {
      set({ isSwitchingLanguage: false });
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Switch failed",
      };
    }
  },

  chatApiUrl: "/api/chat",

  // Chips-gating flag — starts false (no chat yet == no chips to gate against).
  inputGatedByChips: false,
  enableFreeTextInput: () => {
    set({ inputGatedByChips: false });
  },

  activeReference: null,

  setActiveReference: (ref) => {
    set({ activeReference: ref });
  },

  clearActiveReference: () => {
    set({ activeReference: null });
  },

  setChatApiUrl: (url) => {
    set({ chatApiUrl: url });
  },

  loadConversations: async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data = await res.json();
      set({ conversations: data, conversationsLoaded: true });
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  },

  selectConversation: async (id) => {
    // Reset chip gating when switching conversations — the new convo
    // either has no chips yet, or they were already acted on.
    set({ selectedConversationId: id, messages: [], isLoading: true, activeReference: null, inputGatedByChips: false });
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      // New shape: { conversation: { id, language }, messages: [...] }.
      // Old shape (defensive): bare array of messages.
      const messages = Array.isArray(data) ? data : data.messages ?? [];
      const convLang = !Array.isArray(data) && isSupportedLanguage(data.conversation?.language)
        ? (data.conversation.language as string)
        : undefined;
      // Hydrate overlay state from the persisted DB columns so a reload
      // of a conversation faithfully reproduces the full agent surface
      // (Deep-Search card, Verify card, Summary card). Without this,
      // the sidebar click wipes anything that lived only in-store.
      const verifyOverlay: Record<string, MessageVerifyReport> = {};
      const summaryOverlay: Record<string, MessageSummary> = {};
      for (const m of messages) {
        if (!m || typeof m.id !== "string" || m.role !== "assistant") continue;
        if (m.verify_report && typeof m.verify_report === "object") {
          verifyOverlay[m.id] = m.verify_report as MessageVerifyReport;
        }
        if (m.summary && typeof m.summary === "object") {
          summaryOverlay[m.id] = m.summary as MessageSummary;
        }
      }
      set({
        messages,
        isLoading: false,
        messageVerifyReports: verifyOverlay,
        messageSummaries: summaryOverlay,
        ...(convLang ? { chatLanguage: convLang } : {}),
      });
    } catch (err) {
      console.error("Failed to load messages:", err);
      set({ isLoading: false });
    }
  },

  startNewChat: () => {
    set({ selectedConversationId: null, messages: [], activeReference: null, inputGatedByChips: false });
  },

  renameConversation: async (id, title) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));

    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      get().loadConversations();
    }
  },

  archiveConversation: async (id) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, is_archived: true } : c
      ),
      selectedConversationId:
        state.selectedConversationId === id ? null : state.selectedConversationId,
    }));

    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: true }),
    });

    if (!res.ok) get().loadConversations();
  },

  unarchiveConversation: async (id) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, is_archived: false } : c
      ),
    }));

    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_archived: false }),
    });

    if (!res.ok) get().loadConversations();
  },

  deleteConversation: async (id) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      selectedConversationId:
        state.selectedConversationId === id ? null : state.selectedConversationId,
      messages: state.selectedConversationId === id ? [] : state.messages,
      activeReference: state.selectedConversationId === id ? null : state.activeReference,
    }));

    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) get().loadConversations();
  },

  translateMessages: async () => {},

  revertToUserMessage: (userMessageId) => {
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === userMessageId);
      if (idx < 0) return s;
      return {
        messages: s.messages.slice(0, idx),
        inputGatedByChips: false,
      };
    });
  },

  sendMessage: async (content, model) => {
    const state = get();
    const convId = state.selectedConversationId;
    const startMs = Date.now();

    // `let` (not `const`) so the `assistant_persisted` NDJSON event can
    // rebind them to the Postgres UUIDs once the persist block runs.
    // Every downstream event handler matches messages by these ids, so
    // the swap keeps later events (citations_audit, source_en, etc.)
    // pointing at the right row even after the DB roundtrip.
    let tempUserId = `temp-${Date.now()}`;
    const tempUserMsg: Message = {
      id: tempUserId,
      role: "user",
      content,
      originalLanguage: detectLanguage(content),
      created_at: new Date().toISOString(),
    };
    let aiMsgId = `temp-${Date.now()}-ai`;
    const assistantMsg: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      isStreaming: true,
    };
    // Reset chip-gating the moment a new user message goes out. The
    // previous answer's chips are now stale; the input was either just
    // used (if user typed freely) or a chip was clicked (which routes
    // through this same sendMessage). Either way, unlock until the
    // next assistant message with citations lands.
    set((s) => ({
      messages: [...s.messages, tempUserMsg, assistantMsg],
      isLoading: true,
      inputGatedByChips: false,
    }));

    try {
      const history = state.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.role === "assistant" && Array.isArray(m.citations) && m.citations.length > 0
          ? { citations: m.citations }
          : {}),
      }));

      const res = await fetch(state.chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history,
          model,
          conversation_id: convId,
          language: state.chatLanguage,
          deep_search: state.deepSearchEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Guest daily limit hit — surface a signup prompt
        if (res.status === 429) {
          const isGuest = !state.userTier || state.userTier === "free_guest";
          const limitMsg = isGuest
            ? "You've used your free searches for today. Sign up for free to continue — it takes 30 seconds."
            : (data.error || "You've reached your daily search limit. Please try again tomorrow.");
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === aiMsgId
                ? { ...m, isStreaming: false, content: limitMsg, isGuestLimit: true }
                : m
            ),
            isLoading: false,
          }));
          return;
        }
        throw new Error(data.error || "Failed to get response");
      }

      // Handle streaming (NDJSON) response
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop()!;

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === "meta") {
                set((s) => ({
                  selectedConversationId: event.conversation_id || s.selectedConversationId,
                  userTier: event.tier ?? s.userTier,
                  dailyRemaining: event.dailyRemaining ?? s.dailyRemaining,
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, citations: event.citations, tier: event.tier, matchedServices: event.matchedServices }
                      : m
                  ),
                }));
              } else if (event.type === "thinking") {
                // Extended-thinking / reasoning delta from the model.
                // Append to message.thinking and flip isThinking=true until thinking_done.
                const delta = typeof event.content === "string" ? event.content : "";
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, thinking: (m.thinking ?? "") + delta, isThinking: true }
                      : m
                  ),
                }));
              } else if (event.type === "tool_call_start") {
                // { type, id, name, args }
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          toolCalls: [
                            ...(m.toolCalls ?? []),
                            { id: event.id, name: event.name, args: event.args, status: "running" as const },
                          ],
                        }
                      : m
                  ),
                }));
              } else if (event.type === "tool_call_end") {
                // { type, id, result?, error? }
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          toolCalls: (m.toolCalls ?? []).map((tc) =>
                            tc.id === event.id
                              ? {
                                  ...tc,
                                  result: event.result,
                                  error: event.error,
                                  status: event.error ? ("error" as const) : ("done" as const),
                                }
                              : tc
                          ),
                        }
                      : m
                  ),
                }));
              } else if (event.type === "thinking_done") {
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, isThinking: false } : m
                  ),
                }));
              } else if (event.type === "text") {
                const chunk = event.content;
                // If chunk is large (full response at once), simulate streaming
                if (chunk.length > 200) {
                  const words = chunk.split(/(\s+)/);
                  let i = 0;
                  const batchSize = 3; // words per frame
                  const typewrite = () => {
                    if (i < words.length) {
                      const batch = words.slice(i, i + batchSize).join("");
                      streamedContent += batch;
                      set((s) => ({
                        messages: s.messages.map((m) =>
                          m.id === aiMsgId ? { ...m, content: streamedContent } : m
                        ),
                      }));
                      i += batchSize;
                      requestAnimationFrame(typewrite);
                    }
                  };
                  typewrite();
                  // Wait for typewriter to finish before processing next events
                  await new Promise<void>((resolve) => {
                    const check = () => { if (i >= words.length) resolve(); else requestAnimationFrame(check); };
                    check();
                  });
                } else {
                  streamedContent += chunk;
                  set((s) => ({
                    messages: s.messages.map((m) =>
                      m.id === aiMsgId ? { ...m, content: streamedContent } : m
                    ),
                  }));
                }
              } else if (event.type === "meta_update") {
                // Late-arriving metadata (e.g., citations parsed after stream)
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          citations: event.citations ?? m.citations,
                          matchedServices: event.matchedServices ?? m.matchedServices,
                        }
                      : m
                  ),
                }));
              } else if (event.type === "deep_search_report") {
                // Emitted by callOrchestratorDeepSearch once Phase 3 verify
                // completes. Stash as a MessageVerifyReport so the same
                // VerifyResultCard the Verify button uses can render
                // inline under the assistant bubble (see chat-message).
                interface DsVerdict {
                  document_id?: string;
                  section?: string;
                  verdict?: string;
                  section_corrected?: string | null;
                  result_summary?: string;
                }
                const rawVerdicts: DsVerdict[] = Array.isArray(event.verdicts)
                  ? (event.verdicts as DsVerdict[])
                  : [];
                // Verify emits agree/disagree/partial/not_verifiable.
                // VerifyResultCard uses TWO different vocabs:
                //   - claim-level: verified | partially_correct | fabricated |
                //     misquoted | superseded | (default → "Unknown")
                //   - overall-level: verified | mostly_verified | mixed |
                //     unverified | (default → "Unknown")
                // Translate to the claim-level vocab first; derive the
                // overall banner from the worst claim in a second step
                // so both tiers render the right colors + labels.
                const CLAIM_VERDICT_MAP: Record<string, string> = {
                  agree: "verified",
                  partial: "partially_correct",
                  disagree: "fabricated",
                  not_verifiable: "unknown",
                };
                const claims: MessageVerifyClaim[] = rawVerdicts.map((v) => {
                  const rawVerdict =
                    typeof v.verdict === "string" ? v.verdict : "not_verifiable";
                  const summary =
                    typeof v.result_summary === "string"
                      ? v.result_summary
                      : undefined;
                  // Prefer `section_corrected` when verify mapped the
                  // claim to the latest amended location (e.g. the
                  // original cites §264(10) but DOC-011 §56 substitutes
                  // it — corrected section is more informative).
                  const correctedSection =
                    typeof v.section_corrected === "string" &&
                    v.section_corrected.trim().length > 0
                      ? v.section_corrected
                      : null;
                  const rawSection =
                    [v.document_id, v.section]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || undefined;
                  return {
                    cited_section: correctedSection ?? rawSection,
                    verdict: CLAIM_VERDICT_MAP[rawVerdict] ?? "unknown",
                    // `evidence` renders inline in VerifyResultCard.
                    // `explanation` is kept in sync for the PDF renderer
                    // and citation-audit admin surface.
                    evidence: summary,
                    explanation: summary,
                  };
                });
                // Worst-claim severity drives the overall banner.
                const CLAIM_SEVERITY: Record<string, number> = {
                  fabricated: 4,
                  misquoted: 3,
                  partially_correct: 2,
                  unknown: 1,
                  verified: 0,
                };
                const CLAIM_TO_OVERALL: Record<string, string> = {
                  verified: "verified",
                  partially_correct: "mixed",
                  unknown: "mixed",
                  misquoted: "mixed",
                  fabricated: "unverified",
                  superseded: "mixed",
                };
                let worstClaim = "verified";
                let worstSev = -1;
                for (const c of claims) {
                  const v = c.verdict ?? "unknown";
                  const sev = CLAIM_SEVERITY[v] ?? 0;
                  if (sev > worstSev) {
                    worstSev = sev;
                    worstClaim = v;
                  }
                }
                const allVerified =
                  claims.length > 0 &&
                  claims.every((c) => c.verdict === "verified");
                const overall = allVerified
                  ? "verified"
                  : CLAIM_TO_OVERALL[worstClaim] ?? "unknown";
                get().setMessageVerifyReport(aiMsgId, {
                  overall_verdict: overall,
                  claims,
                });
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, deepSearchReport: true } : m
                  ),
                }));
              } else if (event.type === "citations_audit") {
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, citationsAudit: event }
                      : m
                  ),
                }));
              } else if (event.type === "verify_in_progress") {
                // PB Task 3 (D1) — turn-1 batch verify started. Drives
                // the inline verify spinner on the AI bubble.
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, verifyState: "in_progress" }
                      : m,
                  ),
                }));
              } else if (event.type === "verify_progress") {
                // PB Task 3 (D1) — incremental per-group verdicts. Keyed
                // by `${document_id}::${section}` so UI can surface them
                // as each group resolves without waiting for the full
                // turn1_audit aggregate.
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          verdictsByGroup: {
                            ...(m.verdictsByGroup ?? {}),
                            [event.group_key]: event.verdicts,
                          },
                        }
                      : m,
                  ),
                }));
              } else if (event.type === "turn1_audit") {
                // PB Task 3 (D1) — final aggregate. verifyState flips to
                // "done" so the spinner clears; the audit payload feeds
                // any later UI affordance (audit drawer / debug panel).
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          turn1Audit: event.payload,
                          verifyState: "done",
                        }
                      : m,
                  ),
                }));
              } else if (event.type === "corrector_in_progress") {
                // PB Task 6 (F1) — llp-chat-recover started. UI shows
                // a "rewriting answer" affordance while F1 + sanity
                // verify run.
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, correctorState: "in_progress" }
                      : m,
                  ),
                }));
              } else if (event.type === "corrector_skipped") {
                // F1 returned null (fetch / parse / agent failure). Fall
                // through to G1 on original verdicts; flip state to
                // "skipped" so UI clears any in-progress affordance.
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, correctorState: "skipped" }
                      : m,
                  ),
                }));
              } else if (event.type === "corrector_result") {
                // F1 succeeded. Override the rendered answer + citations
                // on the message so the user sees the corrected version.
                // Preserve citation shape — Message.citations expects
                // `{ document_id, document, section, text }`. F1 emits
                // `{ section, document_id, text, verdict_source }`; we
                // synthesize a `document` label from `document_id` so
                // existing renderers (CitationCard, etc.) still work.
                const correctorCitations = Array.isArray(event.citations)
                  ? event.citations.map((c: {
                      section?: string;
                      document_id?: string;
                      text?: string;
                    }) => ({
                      document_id: c.document_id ?? "",
                      document: c.document_id ?? "",
                      section: c.section ?? "",
                      text: c.text ?? "",
                    }))
                  : [];
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          content: typeof event.answer === "string" ? event.answer : m.content,
                          citations: correctorCitations,
                          correctorApplied: true,
                          correctorConfidence: event.confidence,
                          correctorState: "done",
                        }
                      : m,
                  ),
                }));
              } else if (event.type === "confidence_band") {
                // G1 Honesty Guard — emit-gated server side; arrives only
                // when verify flagged at least one citation as
                // not_verifiable / partial / disagree.
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, confidenceBand: event.payload } : m,
                  ),
                }));
              } else if (event.type === "clarify_wipe_text") {
                // Mid-stream prose→clarify recovery: chat-proxy detected
                // a `{"kind":"clarify"` marker after already streaming
                // prose text events. Clear the bubble content now; the
                // clarify_options event follows shortly with the cards.
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, content: "" } : m
                  ),
                }));
              } else if (event.type === "clarify_options") {
                // Turn-1 model chose disambiguation over a long answer.
                // Attach cards to the assistant message — chat-message.tsx
                // renders them as big scenario buttons in place of the
                // text bubble. Input stays locked (inputGatedByChips set
                // true below) until the user picks a card or Others.
                const rawOptions = Array.isArray(event.options) ? event.options : [];
                const safeOptions = rawOptions
                  .filter(
                    (o: unknown): o is { title: string; role?: string; blurb?: string; scenario_query: string } =>
                      !!o &&
                      typeof o === "object" &&
                      typeof (o as Record<string, unknown>).title === "string" &&
                      typeof (o as Record<string, unknown>).scenario_query === "string"
                  )
                  .slice(0, 4)
                  .map((o: { title: string; role?: string; blurb?: string; scenario_query: string }) => ({
                    title: o.title,
                    role: typeof o.role === "string" ? o.role : "general",
                    blurb: typeof o.blurb === "string" ? o.blurb : "",
                    scenario_query: o.scenario_query,
                  }));
                if (safeOptions.length > 0) {
                  set((s) => ({
                    messages: s.messages.map((m) =>
                      m.id === aiMsgId
                        ? {
                            ...m,
                            clarifyOptions: safeOptions,
                            clarifyReason:
                              typeof event.reason === "string" ? event.reason : "",
                            // Blank the bubble — cards are the message body
                            content: "",
                          }
                        : m
                    ),
                  }));
                }
              } else if (event.type === "expert_suggestion") {
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, expertSuggestions: event.experts } : m
                  ),
                }));
              } else if (event.type === "cta") {
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, cta: { text: event.text, targetTier: event.targetTier } }
                      : m
                  ),
                }));
              } else if (event.type === "title_update") {
                // Update conversation title in sidebar immediately
                set((s) => ({
                  conversations: s.conversations.map((c) =>
                    c.id === event.conversation_id
                      ? { ...c, title: event.title }
                      : c
                  ),
                }));
              } else if (event.type === "assistant_persisted") {
                // Server-side persist finished — swap temp ids for the
                // Postgres UUIDs in messages[], messageVerifyReports,
                // and messageSummaries so Verify / Summarize / Download
                // PDF all resolve to the persisted row. Also rebind
                // the local aiMsgId/tempUserId closures so the tail of
                // this stream (e.g. post-done events) matches the new
                // ids.
                const assistantId =
                  typeof event.assistant_id === "string"
                    ? event.assistant_id
                    : null;
                const userId =
                  typeof event.user_id === "string" ? event.user_id : null;
                if (assistantId) {
                  const oldAiId = aiMsgId;
                  const oldUserId = tempUserId;
                  aiMsgId = assistantId;
                  if (userId) tempUserId = userId;
                  set((s) => {
                    const messages = s.messages.map((m) => {
                      if (m.id === oldAiId) return { ...m, id: assistantId };
                      if (userId && m.id === oldUserId)
                        return { ...m, id: userId };
                      return m;
                    });
                    const remapKey = <V,>(
                      map: Record<string, V>,
                      from: string,
                      to: string,
                    ): Record<string, V> => {
                      if (!map[from]) return map;
                      const { [from]: payload, ...rest } = map;
                      return { ...rest, [to]: payload };
                    };
                    return {
                      messages,
                      messageVerifyReports: remapKey(
                        s.messageVerifyReports,
                        oldAiId,
                        assistantId,
                      ),
                      messageSummaries: remapKey(
                        s.messageSummaries,
                        oldAiId,
                        assistantId,
                      ),
                    };
                  });
                }
              } else if (event.event === "delegation_status") {
                // Phase A — llp-chat-followup delegates to llp-chat-verify
                // or llp-chat-filegen; chat-proxy emits pending→complete
                // (or error/timeout) on the same turn-2+ NDJSON stream.
                // Frontend DelegationIndicator reads Message.delegationStatus
                // and renders a pulse + verified badge. Discriminator here
                // is `event.event` (schema-level), not `event.type`.
                const stateRaw =
                  typeof event.state === "string" ? event.state : "";
                const state: "pending" | "complete" | "error" | "timeout" =
                  stateRaw === "complete" ||
                  stateRaw === "error" ||
                  stateRaw === "timeout"
                    ? stateRaw
                    : "pending";
                const verdictRaw =
                  typeof event.verdict === "string" ? event.verdict : "";
                const verdict:
                  | "agree"
                  | "disagree"
                  | "partial"
                  | "not_verifiable"
                  | undefined =
                  verdictRaw === "agree" ||
                  verdictRaw === "disagree" ||
                  verdictRaw === "partial" ||
                  verdictRaw === "not_verifiable"
                    ? verdictRaw
                    : undefined;
                const payload: NonNullable<Message["delegationStatus"]> = {
                  agent:
                    typeof event.agent === "string"
                      ? event.agent
                      : "llp-chat-verify",
                  state,
                  started_at:
                    typeof event.started_at === "string"
                      ? event.started_at
                      : new Date().toISOString(),
                  finished_at:
                    typeof event.finished_at === "string"
                      ? event.finished_at
                      : undefined,
                  section:
                    typeof event.section === "string" ? event.section : null,
                  intent:
                    typeof event.intent === "string" ? event.intent : undefined,
                  verdict,
                  result_summary:
                    typeof event.result_summary === "string"
                      ? event.result_summary
                      : undefined,
                  error_message:
                    typeof event.error_message === "string"
                      ? event.error_message
                      : undefined,
                  trace_id:
                    typeof event.trace_id === "string"
                      ? event.trace_id
                      : undefined,
                };
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, delegationStatus: payload }
                      : m,
                  ),
                }));
              } else if (event.type === "source_en") {
                // English source-of-truth for a translated answer — drives
                // the "View original English" collapsible. Attached to the
                // in-progress assistant message; toggle is gated on
                // isStreaming=false so it only renders post-stream.
                const src = typeof event.content === "string" ? event.content : "";
                if (src) {
                  set((s) => ({
                    messages: s.messages.map((m) =>
                      m.id === aiMsgId ? { ...m, content_en: src } : m,
                    ),
                  }));
                }
              } else if (event.type === "error") {
                throw new Error(event.message || "Stream error");
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue; // Skip malformed JSON
              throw e;
            }
          }
        }

        set((s) => {
          const finalMsgs = s.messages.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  isStreaming: false,
                  isThinking: false,
                  originalLanguage: detectLanguage(m.content),
                  translations: { [detectLanguage(m.content)]: m.content } as Message["translations"],
                }
              : m
          );
          // Gate the input once the assistant message has either
          //   (a) at least one citation → follow-up chips render, OR
          //   (b) a clarify_options card set → disambiguation cards render.
          // Both surfaces require the user to click a chip / card / Others
          // before typing freely again (see chat-message.tsx branch).
          const finalAi = finalMsgs.find((m) => m.id === aiMsgId);
          const hasCitations = Array.isArray(finalAi?.citations) && finalAi!.citations.length > 0;
          const hasClarifyCards =
            Array.isArray(finalAi?.clarifyOptions) && finalAi!.clarifyOptions!.length > 0;
          void track("chat_answer_received", {
            latency_ms: Date.now() - startMs,
            citations: Array.isArray(finalAi?.citations) ? finalAi!.citations.length : 0,
            model: model || "unknown",
            clarify: hasClarifyCards,
          });
          return {
            messages: finalMsgs,
            // Free-text input always available — chips/cards are suggestions,
            // not a gate. User can type at any time without clicking
            // "I'll type my own" or "I have a different question".
            inputGatedByChips: false,
          };
        });
        set({ isLoading: false });
        get().loadConversations();
        return;
      }

      // Fallback: JSON response (non-streaming)
      const data = await res.json();
      const fallbackLang = detectLanguage(data.answer);
      void track("chat_answer_received", {
        latency_ms: Date.now() - startMs,
        citations: Array.isArray(data.citations) ? data.citations.length : 0,
        model: model || "unknown",
        clarify: false,
      });
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                isStreaming: false,
                content: data.answer,
                citations: data.citations,
                originalLanguage: fallbackLang,
                translations: { [fallbackLang]: data.answer } as Message["translations"],
              }
            : m
        ),
        isLoading: false,
        selectedConversationId: data.conversation_id || s.selectedConversationId,
        // Free-text input always available — chips are suggestions,
        // not a gate.
        inputGatedByChips: false,
      }));

      get().loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === aiMsgId
            ? { ...m, isStreaming: false, content: `Error: ${errorMsg}. Please try again.` }
            : m
        ),
        isLoading: false,
      }));
    }
  },
}));
