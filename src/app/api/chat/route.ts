import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import {
  type Tier,
  type ClerkTierMetadata,
  type IntentClassification,
  resolveTier,
  CTA_MESSAGES,
} from "@/lib/ai/framework-types";
import {
  getTierConfigAsync,
  checkDailyRequestLimitAsync,
  checkIntentAccessAsync,
} from "@/lib/ai/tier-middleware";
import { checkRateLimit } from "@/lib/rate-limit";
import { classifyIntent } from "@/lib/ai/intent-classifier";
import { buildSystemPrompt, buildTierBlock } from "@/lib/ai/system-prompt";
import { queryHash, checkCacheHit, savePendingCache } from "@/lib/ai/response-cache";
import { translateChunk } from "@/lib/ai/translate-stream";
import {
  isSupportedLanguage,
  DEFAULT_CHAT_LANGUAGE,
  getLanguage,
} from "@/lib/languages";
import crypto from "crypto";
import { assertDelegationStatusEvent } from "@/lib/validators/delegation-event";
import { normalizeSchemaSection } from "@/lib/normalizers/section";
import { normalizeVerifyProse } from "@/lib/normalizers/verify-prose";
import {
  buildVerifyUserMessage,
  type VerifyClaim,
} from "@/lib/verify/build-user-message";
import {
  parseVerifyBatch,
  type BatchVerdict,
} from "@/lib/verify/parse-batch";
import { getOrchestratorUrl } from "@/lib/orchestrator/url";
import {
  shouldAutoVerify,
  inferClaimFromUserMessage,
  looksLikeChallenge,
  sectionFromCitation,
  type AutoVerifyContext,
  type AutoVerifyPriorTurn,
} from "./heuristic-verify";
import { computeConfidenceBand, type Verdict } from "./confidence-band";
import {
  shouldTriggerTurn1Verify,
  runTurn1VerifyBatch,
  type Turn1Citation,
  type Turn1Verdict,
  type Turn1AuditPayload,
} from "@/lib/verify/turn1-batch";
import {
  buildAugmentedQuery,
  hasDirtyVerdicts,
} from "@/lib/recover/build-augmented-query";
import { runRecover, type RecoverOutput } from "@/lib/recover/run-recover";

// 300s (Vercel Fluid Compute hard cap) — Deep Search needs the headroom:
// search(20) + draft(60) + parallel verify(200) ≈ 280s worst case.
// Continuation + turn-1 paths still finish in <60s, so the higher cap
// only matters for Deep Search.
export const maxDuration = 300;

// ── Agent-orchestrator continuation config (turn 2+ routing) ──
const ORCHESTRATOR_TOKEN = process.env.GOCLAW_TOKEN || "";
const ORCHESTRATOR_USER_ID = process.env.GOCLAW_USER_ID || "admin";
const CONTINUATION_AGENT = "llp-chat-followup";
// 60s budget: openai-codex/gpt-5.4 routinely spends 20-30s on long
// BN continuation payloads (prior §23/§24 answer + 12 verbatim
// citations). 25s was tripping `context canceled` on upstream; 60s
// leaves headroom for the followup + translate round-trip inside the
// 300s Fluid Compute cap.
const CONTINUATION_TIMEOUT_MS = 60_000;
// Tighter budget for orchestrator-side heuristic verify calls — runs
// concurrent with followup, so blocking here only delays the badge, not
// the answer. Matches schema default (15s) minus a safety margin.
const MAX_VERIFY_MS_DEFAULT = 30_000;
const VERIFY_AGENT = "llp-chat-verify";

// ── RAG search keywords ──
const STOP_WORDS = new Set(["what","that","this","with","from","have","been","were","they","their","about","which","when","would","there","will","each","make","like","does","many","some","than","other","into","only","over","such","also","more","after","should","most","before","must","through","just","where","very","between","being","during","without","under","within","upon","could","shall","section","rule","chapter","bangladesh","labour","workers","worker","employer","according","rules","regarding"]);

// Deterministic short hash for log correlation. Avoids leaking the raw
// Clerk userId/conversationId into log lines while keeping a stable
// identifier for grep/SIEM joins (M-13).
function shortId(id: string): string {
  return crypto.createHash("sha256").update(id).digest("hex").slice(0, 8);
}

function extractCitations(text: string): { section: string; document: string }[] {
  const citations: { section: string; document: string }[] = [];
  const seen = new Set<string>();
  const patterns = [
    /Section\s+(\d+[A-Za-z]?)(?:\((\d+)\))?(?:,?\s*(?:Bangladesh\s+)?(?:Labour\s+)?(?:Act|Rules|Amendment|Ordinance)[^,\n)]*(?:,?\s*(\d{4}))?)?/gi,
    /ধারা\s+([০-৯\d]+[ক-হ]?)(?:\s*\((?:Section\s+)?(\d+[A-Za-z]?)\))?/gi,
    /Rule\s+(\d+[A-Za-z]?)(?:\((\d+)\))?/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const section = match[0].trim();
      const key = section.toLowerCase().replace(/\s+/g, " ");
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({ section, document: match[3] ? `Bangladesh Labour Act, ${match[3]}` : "Bangladesh Labour Act, 2006" });
      }
    }
  }
  return citations;
}

// ── Continuation-mode (turn 2+) helper ─────────────────────────────
// Routes the request to agent orchestrator `llp-chat-followup` in `continuation`
// mode instead of the chat-proxy Grok path. Used when the current conversation
// already has at least one assistant message (i.e., the user is following up
// rather than starting fresh).
//
// Why: turn-1 Grok answers are grounded in live RAG, turn-2+ just needs to
// extend the prior context. GPT-5.4 is cheaper + faster for extension when
// the source citations are already captured. Phase 1 ships non-streaming —
// single orchestrator wait, then emit the whole answer as one NDJSON text event.
//
// Orchestrator gotcha (same as /followup + /summarize): a ~9.8KB system preamble
// dilutes agent frontmatter directives. We defensively repeat the output
// format in the user message + regex-fallback-parse the response.
interface ContinuationContext {
  userMessage: string;
  resolvedHistory: { role: string; content: string; citations?: Array<{ section?: string; document?: string; document_id?: string; text?: string }> | null }[];
  language: "en" | "bn";
  /** User-chosen response language (en | bn | hi | zh | ko | ja | ar | ur | ms).
   *  Drives output translation. Distinct from `language` (input detection). */
  chatLanguage: string;
  convId: string;
  tier: Tier;
  dailyRemaining: number;
  userId: string;
  conversationId?: string;
  queryHashValue: string;
  supabaseClient: ReturnType<typeof createServerClient>;
  /** When true, callOrchestratorDeepSearch runs instead of callOrchestratorContinuation.
   *  Pipeline: chat-proxy /search → llp-chat-followup draft → per-citation
   *  llp-chat-verify audit → emit deep_search_report NDJSON event. */
  deepSearch?: boolean;
}

interface ContinuationCitation {
  section?: string;
  document?: string;
  document_id?: string;
  text?: string;
}

interface ContinuationResponse {
  answer?: string;
  citations?: ContinuationCitation[];
  language?: string;
  error?: string;
}

function extractContinuationObject(raw: string): ContinuationResponse | null {
  const unfenced = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();
  const tryParse = (s: string): ContinuationResponse | null => {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as ContinuationResponse;
      }
    } catch {
      /* fall through */
    }
    return null;
  };
  const direct = tryParse(unfenced);
  if (direct) return direct;
  // Greedy regex fallback — first {...} substring
  const greedy = unfenced.match(/\{[\s\S]*\}/);
  if (greedy) return tryParse(greedy[0]);
  return null;
}

function buildContinuationUserMessage(
  userQuestion: string,
  history: ContinuationContext["resolvedHistory"],
  language: "en" | "bn",
  verbatim: ContinuationCitation[],
  chatLanguage: string,
): string {
  // Drop empty-content assistant turns (clarify-cards placeholders) so
  // the follow-up agent doesn't see `{role:"assistant",content:""}` and
  // trigger its "no_prior_context" fallback.
  const filtered = history.filter(
    (m) => !(m.role === "assistant" && (!m.content || (typeof m.content === "string" && m.content.trim().length === 0))),
  );
  // Trim history: keep last 6 turns, clip each content to 1200 chars,
  // cap per-turn citations to 6, and verbatim to 8. Smaller payload →
  // faster gpt-5.4 read phase → fewer timeouts + fewer tokens off the
  // model's attention budget for hallucinating outside-corpus law.
  const trimmedHistory = filtered.slice(-6).map((m) => {
    const content = typeof m.content === "string" && m.content.length > 1200
      ? m.content.slice(0, 1200) + "..."
      : m.content;
    const base: Record<string, unknown> = { role: m.role, content };
    if (m.role === "assistant" && Array.isArray(m.citations) && m.citations.length > 0) {
      base.citations = m.citations.slice(0, 6);
    }
    return base;
  });

  const responseLang = getLanguage(chatLanguage);

  const payload = {
    mode: "continuation",
    user_question: userQuestion,
    conversation_history: trimmedHistory,
    language,
    response_language: { code: responseLang.code, name: responseLang.geminiName },
    source_citations_verbatim: verbatim.slice(0, 8),
  };

  return `MODE: continuation

Input data:
${JSON.stringify(payload)}

SCOPE RULES:
- You are a Bangladesh labour law assistant. The corpus is EXCLUSIVELY: Bangladesh Labour Act 2006 (+ 2009/2010/2013/2018/2025/2026 amendments) and Bangladesh Labour Rules 2015 (+ 2022 amendment). All citations must come from this corpus.
- NEVER cite Indian law, UK law, or any foreign statute. Example of FORBIDDEN citation: "Employees' Provident Funds and Miscellaneous Provisions Act 1952" (that is an Indian statute).
- The user's follow-up may ask about OTHER sections of the Bangladesh corpus that were not cited in the prior answer (e.g. prior turn discussed §23/§24 investigation, follow-up asks about §26 termination or §33 appeals). ANSWER these — they are in scope. Use the prior assistant turn as reference material and extend naturally.
- Citation policy:
  • If the section appears in conversation_history.citations or source_citations_verbatim → cite it exactly as shown (act + year + section).
  • If you must reference a Bangladesh section that is NOT in verbatim, you may include it in prose but add the caveat "(please verify the current gazette text for exact wording)" next to that citation.
  • If you are not confident about a specific section number, OMIT the number and describe the rule without a numeric cite. An empty citations array is acceptable; an invented or wrong citation is a critical failure.
- Use out_of_scope ONLY when the user asks about something genuinely outside Bangladesh labour law — foreign statutes, general contract law, tax law, etc. Shape: {"answer":"<short explanation>","citations":[],"language":"${responseLang.code}","out_of_scope":true}
- DO NOT refuse a follow-up just because a specific Bangladesh section wasn't cited in the prior turn. The prior answer is a starting point, not a hard boundary.

LANGUAGE RULES (strict):
- Write the entire \`answer\` field in ${responseLang.geminiName} (code: ${responseLang.code}). This is the user's chosen response language — do NOT default to English when it differs.
- Preserve section numbers bilingually (e.g. "Section 26 / ধারা ২৬"), document names as in corpus, and English legal terms that lack a standard translation.
- Preserve markdown formatting (headings, bold, lists).
- Set the output \`language\` field to "${responseLang.code}" (the response language you wrote in).

OUTPUT RULES (strict):
- Respond with a raw JSON object ONLY.
- NO prose, NO code fence, NO preamble, NO commentary.
- Exact shape: {"answer":"<markdown body in ${responseLang.geminiName}>","citations":[{"section":"...","document":"...","document_id":"...","text":"..."}],"language":"${responseLang.code}"}
- If conversation_history lacks an assistant turn, respond with {"error":"no_prior_context"}.`;
}

interface CallAgentOptions {
  /** Override the X-Agent-Id header. Used when the orchestrator
   *  fires llp-chat-verify directly (heuristic auto-trigger) instead of
   *  the default llp-chat-followup. Timeout is overridable for tighter
   *  verify budgets (12s default vs 25s continuation). */
  agent_override?: string;
  timeout_ms?: number;
}

async function callOrchestratorContinuationAgent(
  userMessage: string,
  options: CallAgentOptions = {},
): Promise<
  | { ok: true; content: string; rawData: unknown }
  | { ok: false; status: number; error: string }
> {
  const agentId = options.agent_override || CONTINUATION_AGENT;
  const timeoutMs = options.timeout_ms ?? CONTINUATION_TIMEOUT_MS;
  try {
    const res = await fetch(`${getOrchestratorUrl(agentId)}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ORCHESTRATOR_TOKEN}`,
        "X-GoClaw-User-Id": ORCHESTRATOR_USER_ID,
        "X-GoClaw-Agent-Id": agentId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      let body = "";
      try { body = await res.text(); } catch { /* ignore */ }
      return { ok: false, status: res.status, error: body.slice(0, 400) || `HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) return { ok: false, status: 502, error: "empty_agent_response" };
    return { ok: true, content, rawData: data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
    return { ok: false, status: isTimeout ? 504 : 504, error: `fetch_error: ${msg}` };
  }
}

// ── Phase A delegation_status plumbing ──────────────────────────────
// llp-chat-followup can delegate to llp-chat-verify / llp-chat-filegen
// via the orchestrator's `delegate` tool (tools_config applied via DB; see commit
// 3bb42c2ce). We parse the non-streaming orchestrator response for delegate
// tool_calls + an optional metadata.delegations trace, and surface each
// as a pending→complete NDJSON pair so the frontend DelegationIndicator
// can render a pulse + verified-badge. Schemas:
// - chat-proxy/data/delegation-request-schema.json
// - chat-proxy/data/delegation-status-event-schema.json
function mintTraceId(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = crypto.randomBytes(3).toString("hex");
  return `trc_${iso}_${rand}`;
}

type DelegationAgent = "llp-chat-verify" | "llp-chat-filegen";
type DelegationVerdict = "agree" | "disagree" | "partial" | "not_verifiable";

interface DelegationHit {
  agent: DelegationAgent;
  intent: string;
  section: string | null;
  verdict?: DelegationVerdict;
  result_summary?: string;
  /** Sub-agent's raw prose output (if surfaced by the orchestrator). Used to derive
   *  verdict + summary when the contracted JSON shape didn't round-trip —
   *  see `normalizeVerifyProse`. */
  prose?: string;
  /** Original claim text from the delegate tool_call args; passed as a
   *  hint to the prose normalizer so it can fall back to
   *  expected_section when prose lacks a DOC-### §N pattern. */
  claim?: string;
}

function pickProseField(obj: Record<string, unknown>): string | undefined {
  // The orchestrator surfaces sub-agent output under one of several field names
  // depending on provider (claude-cli vs openai-codex). Try the common
  // ones; first non-empty wins.
  const candidates = ["output", "response", "content", "result_text", "final_message", "message", "result"];
  for (const k of candidates) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return undefined;
}

function extractDelegationsFromResponse(data: unknown): DelegationHit[] {
  const out: DelegationHit[] = [];
  if (!data || typeof data !== "object") return out;
  const root = data as Record<string, unknown>;

  const choices = Array.isArray(root.choices) ? (root.choices as Array<Record<string, unknown>>) : [];
  const firstMsg = (choices[0]?.message ?? {}) as Record<string, unknown>;
  const toolCalls = Array.isArray(firstMsg.tool_calls) ? (firstMsg.tool_calls as Array<Record<string, unknown>>) : [];

  // Collect tool-role messages keyed by tool_call_id so we can pair each
  // delegate tool_call with its sub-agent response prose. The orchestrator surfaces
  // the sub-agent's reply as a `role=tool` message in `choices[*].message`.
  const toolResponsesById = new Map<string, string>();
  for (const choice of choices) {
    const msg = (choice?.message ?? {}) as Record<string, unknown>;
    if (msg.role !== "tool") continue;
    const id = typeof msg.tool_call_id === "string" ? msg.tool_call_id : null;
    const content = typeof msg.content === "string" ? msg.content : null;
    if (id && content && content.trim().length > 0) toolResponsesById.set(id, content);
  }

  for (const tc of toolCalls) {
    const fn = (tc.function ?? {}) as Record<string, unknown>;
    if (fn.name !== "delegate") continue;
    let args: Record<string, unknown> = {};
    const rawArgs = fn.arguments;
    if (typeof rawArgs === "string") {
      try { args = JSON.parse(rawArgs) as Record<string, unknown>; } catch { /* ignore */ }
    } else if (rawArgs && typeof rawArgs === "object") {
      args = rawArgs as Record<string, unknown>;
    }
    const target = typeof args.target_agent === "string" ? args.target_agent : null;
    if (target !== "llp-chat-verify" && target !== "llp-chat-filegen") continue;
    const tcId = typeof tc.id === "string" ? tc.id : null;
    const prose = tcId ? toolResponsesById.get(tcId) : undefined;
    out.push({
      agent: target,
      intent: typeof args.intent === "string" ? args.intent : "unknown",
      section: typeof args.expected_section === "string" ? args.expected_section : null,
      claim: typeof args.claim === "string" ? args.claim : undefined,
      prose,
    });
  }

  // Optional: the orchestrator may also surface a post-hoc trace on metadata.delegations
  const meta = (root.metadata ?? {}) as Record<string, unknown>;
  const metaDelegations = Array.isArray(meta.delegations) ? (meta.delegations as Array<Record<string, unknown>>) : [];
  for (const d of metaDelegations) {
    const target = typeof d.target_agent === "string" ? d.target_agent : null;
    if (target !== "llp-chat-verify" && target !== "llp-chat-filegen") continue;
    const v = String(d.verdict ?? "");
    const verdict: DelegationVerdict | undefined =
      v === "agree" || v === "disagree" || v === "partial" || v === "not_verifiable" ? v : undefined;
    out.push({
      agent: target,
      intent: typeof d.intent === "string" ? d.intent : "unknown",
      section: typeof d.expected_section === "string" ? d.expected_section : null,
      verdict,
      result_summary: typeof d.result_summary === "string" ? d.result_summary : undefined,
      prose: pickProseField(d),
      claim: typeof d.claim === "string" ? d.claim : undefined,
    });
  }
  return out;
}

function isMockContinuationMode(): boolean {
  return !process.env.GOCLAW_URL || !process.env.GOCLAW_TOKEN;
}

// `normalizeSchemaSection` lives in `@/lib/normalizers/section` so the
// verify-prose normalizer can share it. Schema pattern for reference:
//   ^DOC-\d{3} §\d+[A-Z]?$  (e.g. "DOC-010 §20", "DOC-007 §27A").
function pickSchemaSection(verbatim: ContinuationCitation[]): string | null {
  for (const v of verbatim) {
    const got = normalizeSchemaSection(v?.section, v?.document_id);
    if (got) return got;
  }
  return null;
}

interface DelegationEventBase {
  event: "delegation_status";
  trace_id: string;
  agent: DelegationAgent;
  intent: string;
  section: string | null;
  started_at: string;
}

function emitDelegationStatus(obj: Record<string, unknown>): string {
  // Dev-only schema assertion; no-op in production. Catches shape drift
  // between chat-proxy emitters and the schema during local testing.
  assertDelegationStatusEvent(obj);
  return JSON.stringify(obj) + "\n";
}

function delegationPendingEvent(base: DelegationEventBase): string {
  return emitDelegationStatus({ ...base, state: "pending" });
}

function delegationCompleteEvent(
  base: DelegationEventBase,
  finishedAt: string,
  verdict: DelegationVerdict | undefined,
  resultSummary: string | undefined,
): string {
  return emitDelegationStatus({
    ...base,
    state: "complete",
    finished_at: finishedAt,
    ...(verdict ? { verdict } : {}),
    ...(resultSummary ? { result_summary: resultSummary } : {}),
  });
}

function delegationErrorEvent(
  base: Omit<DelegationEventBase, "intent"> & { intent?: string },
  finishedAt: string,
  state: "error" | "timeout",
  errorMessage: string,
): string {
  return emitDelegationStatus({
    ...base,
    intent: base.intent ?? "unknown",
    state,
    finished_at: finishedAt,
    error_message: errorMessage,
  });
}

/**
 * Fetch verbatim source citations from the most recent assistant message in
 * this conversation. Uses Supabase if conversationId provided, otherwise falls
 * back to inline history citations (which client does not typically send).
 */
async function getSourceCitationsVerbatim(
  ctx: ContinuationContext,
): Promise<ContinuationCitation[]> {
  // 1. Check inline history first (cheaper — no DB round-trip)
  const lastAssistant = [...ctx.resolvedHistory].reverse().find((m) => m.role === "assistant");
  if (lastAssistant?.citations && Array.isArray(lastAssistant.citations) && lastAssistant.citations.length > 0) {
    return lastAssistant.citations;
  }

  // 2. Fallback: query Supabase for the last assistant message's citations
  if (!ctx.conversationId) return [];
  try {
    const { data } = await ctx.supabaseClient
      .from("messages")
      .select("citations")
      .eq("conversation_id", ctx.conversationId)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1);
    const first = data?.[0];
    if (first?.citations && Array.isArray(first.citations)) {
      return first.citations as ContinuationCitation[];
    }
  } catch {
    /* fail-open */
  }
  return [];
}

async function callOrchestratorContinuation(ctx: ContinuationContext): Promise<Response> {
  const encoder = new TextEncoder();

  // Phase A delegation_status lifecycle (pending → complete | error |
  // timeout) fires through delegationPendingEvent / delegationCompleteEvent /
  // delegationErrorEvent. Each helper returns a serialized NDJSON line.
  // Intercept on the way to `controller.enqueue` so we can cache the
  // final payload and persist it on the assistant row — otherwise the
  // badge vanishes on sidebar reload even when verify ran successfully.
  let capturedDelegationStatus: Record<string, unknown> | null = null;
  const captureAndEncode = (rawLine: string): Uint8Array => {
    try {
      const parsed = JSON.parse(rawLine);
      if (parsed && typeof parsed === "object" && parsed.event === "delegation_status") {
        capturedDelegationStatus = parsed as Record<string, unknown>;
      }
    } catch {
      /* non-JSON lines pass through unchanged */
    }
    return encoder.encode(rawLine);
  };

  const verbatim = await getSourceCitationsVerbatim(ctx);
  const userMsg = buildContinuationUserMessage(
    ctx.userMessage,
    ctx.resolvedHistory,
    ctx.language,
    verbatim,
    ctx.chatLanguage,
  );

  // Phase A: trace_id minted once, echoed on every delegation_status event
  // so the frontend can correlate pending → complete transitions.
  const traceId = mintTraceId();
  const mockMode = isMockContinuationMode();
  const defaultSection = pickSchemaSection(verbatim);

  // ── Heuristic auto-verify state (turn-2+ orchestrator trigger) ──
  // Decided BEFORE we hit the orchestrator so the pending event flushes first —
  // empirically llp-chat-followup never fires the `delegate` tool_call
  // (see internal memory on delegate event shape). Without this
  // rule, the badge scaffolding in the stream never sees a real event.
  const priorAssistantTurn =
    [...ctx.resolvedHistory].reverse().find(
      (m) =>
        m.role === "assistant" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    ) ?? null;
  const assistantTurnsSoFar = ctx.resolvedHistory.filter(
    (m) =>
      m.role === "assistant" &&
      typeof m.content === "string" &&
      m.content.trim().length > 0,
  ).length;
  const heuristicCtx: AutoVerifyContext = {
    turn_index: assistantTurnsSoFar + 1,
    user_message: ctx.userMessage,
    prior_assistant_turn: priorAssistantTurn as AutoVerifyPriorTurn | null,
    followup_delegation_signaled: false,
  };
  const heuristicFires = shouldAutoVerify(heuristicCtx);

  const stream = new ReadableStream({
    async start(controller) {
      // Always emit meta first (same shape as turn-1 path)
      controller.enqueue(encoder.encode(JSON.stringify({
        type: "meta",
        conversation_id: ctx.convId,
        tier: ctx.tier,
        dailyRemaining: Math.max(0, ctx.dailyRemaining),
        model: "gpt-5.4",
        continuation: true,
      }) + "\n"));

      let answer = "";
      let citations: ContinuationCitation[] = [];
      let parseFailed = false;

      // ── Phase A mock fallback ────────────────────────────────────
      // Agent-orchestrator creds missing → scripted pending→complete pair after 2s
      // so the UI delegation indicator can be exercised without the bridge host.
      // When the heuristic-auto-verify trigger would have fired in
      // real-mode, tag the summary so the dev can distinguish the
      // orchestrator-side path from the followup-delegate path.
      if (mockMode) {
        // ── Anthropic direct fallback for turn-2+ (no GOCLAW configured) ──
        console.log("[chat] continuation · GOCLAW not set — falling back to Anthropic direct");
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        if (!ANTHROPIC_API_KEY) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: "AI service not configured." }) + "\n"));
          controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          controller.close();
          return;
        }
        try {
          const contMessages = [
            ...((ctx.resolvedHistory || []).slice(-8).map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: typeof m.content === "string" ? m.content : "",
            }))),
            { role: "user" as const, content: ctx.userMessage },
          ];
          const anthropicContinuationRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              system: buildSystemPrompt(ctx.tier, { intents: ["FACTUAL"], primary_intent: "FACTUAL", domain: "other", cross_domains: [], urgency: "general", language: ctx.language === "bn" ? "bangla" : "english", requires_file: false, perspective: "neutral" }, []),
              messages: contMessages,
              stream: true,
            }),
          });
          if (!anthropicContinuationRes.ok || !anthropicContinuationRes.body) {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: "AI service temporarily unavailable." }) + "\n"));
            controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
            controller.close();
            return;
          }
          const contReader = anthropicContinuationRes.body.getReader();
          const contDecoder = new TextDecoder();
          let contBuffer = "";
          let contFullText = "";
          while (true) {
            const { done, value } = await contReader.read();
            if (done) break;
            contBuffer += contDecoder.decode(value, { stream: true });
            const lines = contBuffer.split("\n");
            contBuffer = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                    const chunk = parsed.delta.text;
                    contFullText += chunk;
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "text", content: chunk }) + "\n"));
                  }
                } catch { /* skip malformed */ }
              }
            }
          }
          const contCitations = extractCitations(contFullText);
          if (contCitations.length > 0) {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations: contCitations }) + "\n"));
          }
          const title = ctx.userMessage.length > 60 ? ctx.userMessage.slice(0, 57) + "..." : ctx.userMessage;
          controller.enqueue(encoder.encode(JSON.stringify({ type: "title_update", conversation_id: ctx.convId, title }) + "\n"));
          controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          // Persist
          const sb = createServerClient();
          sb.from("conversations").upsert({ id: ctx.convId, user_id: ctx.userId, title, language: ctx.chatLanguage, updated_at: new Date().toISOString() }, { onConflict: "id" }).then(null, () => {});
          sb.from("messages").insert([
            { conversation_id: ctx.convId, role: "user", content: ctx.userMessage, language: ctx.chatLanguage },
            { conversation_id: ctx.convId, role: "assistant", content: contFullText, language: ctx.chatLanguage, citations: contCitations },
          ]).then(null, () => {});
        } catch (err) {
          console.error("[chat] Anthropic continuation fallback error:", err);
          controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: "AI service error." }) + "\n"));
          controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
        }
        controller.close();
        return;
      }

      // ── Real orchestrator path ────────────────────────────────────
      // Fetch moved inside the stream so pending is flushed before the
      // blocking await, giving the UI a real pulse window.
      //
      // Heuristic auto-verify runs CONCURRENTLY with followup: the
      // pending event emits now, verify fires in parallel, followup is
      // awaited next. verify's complete/timeout/error is emitted after
      // the followup delegations+text so the badge resolves at the end
      // of the stream — prose arrives first, verdict second.
      let heuristicBase: DelegationEventBase | null = null;
      let heuristicClaim: string | null = null;
      let heuristicClaims: VerifyClaim[] = [];
      let verifyPromise: ReturnType<typeof callOrchestratorContinuationAgent> | null =
        null;
      if (heuristicFires) {
        const heuristicSection =
          sectionFromCitation(priorAssistantTurn?.citations?.[0]) ?? defaultSection;
        const startedAt = new Date().toISOString();
        heuristicBase = {
          event: "delegation_status",
          trace_id: traceId,
          agent: VERIFY_AGENT,
          intent: "verify_section_citation",
          section: heuristicSection,
          started_at: startedAt,
        };
        controller.enqueue(captureAndEncode(delegationPendingEvent(heuristicBase)));
        heuristicClaim = inferClaimFromUserMessage(
          ctx.userMessage,
          priorAssistantTurn as AutoVerifyPriorTurn | null,
        );
        const conversationContext = ctx.resolvedHistory
          .slice(-6)
          .map((m) => {
            const role = m.role === "user" ? "User" : "Assistant";
            const content =
              typeof m.content === "string" ? m.content.slice(0, 400) : "";
            return `${role}: ${content}`;
          });
        // Brief 5 root-cause #3 → user-message suffix is the reliable
        // lever on claude-cli/opus. CAPABILITIES.md's "mandatory workflow"
        // rule is observed weakly; Opus routinely skips read_file and
        // answers from training. Prepending a hard directive BEFORE the
        // JSON payload empirically flips the agent into tool-use mode.
        //
        // Single-claim case: batch-of-one. The batch schema is uniform
        // across heuristic + Deep Search paths so verify emits one
        // output shape (`{"verdicts":[...]}`) everywhere.
        heuristicClaims = [
          {
            id: "c0",
            claim: heuristicClaim ?? ctx.userMessage,
            expected_section: heuristicSection ?? "",
          },
        ];
        const verifyInput = buildVerifyUserMessage({
          claims: heuristicClaims,
          conversation_context: conversationContext,
        });
        verifyPromise = callOrchestratorContinuationAgent(verifyInput, {
          agent_override: VERIFY_AGENT,
          timeout_ms: MAX_VERIFY_MS_DEFAULT,
        });
      }

      // Emit heuristic verify's terminal event (complete | timeout |
      // error). Called right before each `type: "done"` exit so the
      // badge resolves before the stream terminates. No-op when the
      // heuristic didn't fire.
      const emitHeuristicFinal = async (): Promise<void> => {
        if (!verifyPromise || !heuristicBase) return;
        const finishedAt = new Date().toISOString();
        try {
          const verifyRes = await verifyPromise;
          if (verifyRes.ok) {
            // Batch parse (single-entry): verify emits `verdicts[]` for
            // every invocation under the new schema. Fall back to the
            // prose normalizer only if the batch parse couldn't find a
            // JSON envelope — covers platform-level output corruption.
            const batch = parseVerifyBatch(verifyRes.content, heuristicClaims);
            const v = batch[0];
            const verdict = v?.verdict ?? "not_verifiable";
            const summary = v?.result_summary ??
              normalizeVerifyProse(verifyRes.content, {
                expected_section: heuristicBase.section ?? undefined,
                claim: heuristicClaim ?? undefined,
              }).result_summary;
            controller.enqueue(captureAndEncode(delegationCompleteEvent(
              heuristicBase,
              new Date().toISOString(),
              verdict,
              summary,
            )));
          } else {
            const isTimeout = /TimeoutError/.test(verifyRes.error);
            controller.enqueue(captureAndEncode(delegationErrorEvent(
              heuristicBase,
              new Date().toISOString(),
              isTimeout ? "timeout" : "error",
              isTimeout
                ? `verify did not respond within ${MAX_VERIFY_MS_DEFAULT}ms; followup proceeded without verification.`
                : verifyRes.error.slice(0, 400),
            )));
          }
        } catch (err) {
          controller.enqueue(captureAndEncode(delegationErrorEvent(
            heuristicBase,
            finishedAt,
            "error",
            err instanceof Error ? err.message : String(err),
          )));
        }
        // Null out so a second accidental call is a noop.
        verifyPromise = null;
      };

      const callStartedAt = new Date().toISOString();
      const result = await callOrchestratorContinuationAgent(userMsg);
      const callFinishedAt = new Date().toISOString();

      if (result.ok) {
        // Surface any delegate tool_calls as pending→complete pairs. We
        // emit both back-to-back since the orchestrator is non-streaming here; the
        // UI still benefits from the final complete-state badge. Phase B
        // (streaming) will widen the pending window.
        const delegations = extractDelegationsFromResponse(result.rawData);
        for (const d of delegations) {
          // Condition 4 dedupe: if the heuristic already fired for
          // verify, swallow any followup-signaled verify delegation
          // here to avoid double-emit under the same trace_id. Filegen
          // delegations still pass through.
          if (heuristicFires && d.agent === VERIFY_AGENT) continue;
          const base: DelegationEventBase = {
            event: "delegation_status",
            trace_id: traceId,
            agent: d.agent,
            intent: d.intent,
            section: normalizeSchemaSection(d.section) ?? defaultSection,
            started_at: callStartedAt,
          };
          controller.enqueue(captureAndEncode(delegationPendingEvent(base)));

          // For llp-chat-verify: if the orchestrator didn't surface a structured
          // verdict (metadata.delegations lacked one OR only a tool_call
          // was emitted) but we captured the sub-agent's prose, normalize
          // that prose into a verdict + summary. This is the Brief 7
          // mitigation for platform-level constraints documented in
          // docs/agents/llp-chat-verify-config-2026-04-22.md (Brief 5).
          let verdict: DelegationVerdict | undefined = d.verdict;
          let resultSummary: string | undefined = d.result_summary;
          if (d.agent === "llp-chat-verify" && !verdict && typeof d.prose === "string" && d.prose.trim().length > 0) {
            const normalized = normalizeVerifyProse(d.prose, {
              expected_section: base.section ?? undefined,
              claim: d.claim,
            });
            verdict = normalized.verdict;
            if (!resultSummary) resultSummary = normalized.result_summary;
            if (!base.section && normalized.section) base.section = normalized.section;
          }

          controller.enqueue(captureAndEncode(delegationCompleteEvent(
            base,
            callFinishedAt,
            verdict,
            resultSummary,
          )));
        }

        const parsed = extractContinuationObject(result.content);
        if (parsed && !parsed.error && typeof parsed.answer === "string" && parsed.answer.trim().length > 0) {
          answer = parsed.answer;
          citations = Array.isArray(parsed.citations) ? parsed.citations : [];
        } else {
          parseFailed = true;
          console.warn(
            `[chat.continuation] parse failed or error · preview=${result.content.slice(0, 200)}`
          );
        }
      } else {
        // Surface orchestrator failure as a delegation-status error/timeout so
        // any indicator pulse in the UI resolves instead of hanging. We
        // don't know whether a delegation was actually attempted — a
        // definitive final state is safer than silence.
        const state: "timeout" | "error" = result.status === 504 ? "timeout" : "error";
        controller.enqueue(captureAndEncode(delegationErrorEvent({
          event: "delegation_status",
          trace_id: traceId,
          agent: "llp-chat-verify",
          section: defaultSection,
          started_at: callStartedAt,
        }, callFinishedAt, state, `upstream_${state}`)));
        parseFailed = true;
        console.warn(
          `[chat.continuation] orchestrator call failed status=${result.status} err=${result.error.slice(0, 200)}`
        );
      }

      if (parseFailed) {
        controller.enqueue(encoder.encode(JSON.stringify({
          type: "error",
          message: "continuation_parse_failed",
        }) + "\n"));
        await emitHeuristicFinal();
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
        controller.close();
        return;
      }

      // Translate the answer if user chose a non-English response language.
      // The orchestrator returns one full English string, so a single Gemini call beats
      // paragraph-pipelining here.
      const englishAnswer = answer;
      let renderedAnswer = englishAnswer;
      if (ctx.chatLanguage !== "en") {
        controller.enqueue(encoder.encode(JSON.stringify({
          type: "translating",
          language: ctx.chatLanguage,
        }) + "\n"));
        renderedAnswer = await translateChunk(englishAnswer, {
          language: ctx.chatLanguage,
        });
      }

      // Emit answer as a single text event (non-streaming phase 1)
      controller.enqueue(encoder.encode(JSON.stringify({ type: "text", content: renderedAnswer }) + "\n"));

      // Stash English source-of-truth on the client so it can render the
      // collapsible "View original English" block beneath the translated copy.
      if (ctx.chatLanguage !== "en" && renderedAnswer !== englishAnswer) {
        controller.enqueue(encoder.encode(JSON.stringify({
          type: "source_en",
          content: englishAnswer,
        }) + "\n"));
      }

      // Emit citations if any (same meta_update shape the turn-1 path uses)
      if (citations.length > 0) {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations }) + "\n"));
      } else {
        // Fallback: run the regex extractor on the answer text to populate
        // at least basic section references if the agent omitted them.
        const fallback = extractCitations(answer);
        if (fallback.length > 0) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations: fallback }) + "\n"));
        }
      }

      // Title update (same as turn-1 path — first ~60 chars of user msg)
      const title = ctx.userMessage.length > 60 ? ctx.userMessage.slice(0, 57) + "..." : ctx.userMessage;
      controller.enqueue(encoder.encode(JSON.stringify({ type: "title_update", conversation_id: ctx.convId, title }) + "\n"));

      await emitHeuristicFinal();
      controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));

      // Persist conversation (same as turn-1 path — keep both paths symmetric).
      // For non-English chats: store rendered text in content, English in
      // content_en for audit + future re-translation.
      const isTranslated = ctx.chatLanguage !== "en" && renderedAnswer !== englishAnswer;
      let aiMessageId: string | null = null;
      try {
        const sb = createServerClient();
        await sb.from("conversations").upsert({
          id: ctx.convId,
          user_id: ctx.userId,
          title,
          language: ctx.chatLanguage,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        const { data: inserted, error: insErr } = await sb.from("messages").insert([
          {
            conversation_id: ctx.convId,
            role: "user",
            content: ctx.userMessage,
            language: ctx.chatLanguage,
          },
          {
            conversation_id: ctx.convId,
            role: "assistant",
            content: renderedAnswer,
            content_en: isTranslated ? englishAnswer : null,
            language: ctx.chatLanguage,
            citations,
            delegation_status: capturedDelegationStatus,
          },
        ]).select("id, role");
        if (insErr) console.error("[chat/continuation] messages.insert failed", { convId: ctx.convId, insErr });
        aiMessageId = inserted?.find((m) => m.role === "assistant")?.id ?? null;
        const userMessageId = inserted?.find((m) => m.role === "user")?.id ?? null;

        // Tell the client what DB ids the temp-ids mapped to. The
        // store swaps temp → uuid on its messages[], messageVerifyReports
        // and messageSummaries so overlay-carrying features (Verify /
        // Summarize / PDF export) still resolve after streaming.
        if (aiMessageId) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: "assistant_persisted",
            assistant_id: aiMessageId,
            user_id: userMessageId,
          }) + "\n"));
        }

        // Warm message_translations cache for the per-message translate UI.
        if (isTranslated && aiMessageId) {
          try {
            await sb.from("message_translations").upsert(
              {
                message_id: aiMessageId,
                language: ctx.chatLanguage,
                translated_content: renderedAnswer,
              },
              { onConflict: "message_id,language" },
            );
          } catch { /* cache warming is non-critical */ }
        }
      } catch { /* ignore persistence failure — answer already streamed */ }

      // Save pending cache (English source-of-truth — translations derived later).
      if (englishAnswer.length > 100) {
        try {
          const sb2 = createServerClient();
          if (!aiMessageId) {
            const { data: lastMsg } = await sb2
              .from("messages")
              .select("id")
              .eq("conversation_id", ctx.convId)
              .eq("role", "assistant")
              .order("created_at", { ascending: false })
              .limit(1);
            aiMessageId = lastMsg?.[0]?.id || null;
          }
          const cacheCitations = citations.map((c) => ({
            section: c.section || "",
            document: c.document || "",
          })).filter((c) => c.section);
          await savePendingCache(ctx.queryHashValue, ctx.userMessage, englishAnswer, cacheCitations, aiMessageId ?? undefined, ctx.convId);
        } catch { /* ignore */ }
      }

      // Usage tracking — T2+ continuation served by the llp-chat-followup agent
      // (GPT-5.4 via Codex sub → stream 2). Char-count placeholder until P4
      // wires real `usage_tokens` events from upstream; chars/4 floored.
      try {
        const { ConvexHttpClient } = await import("convex/browser");
        const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        const { api: convexApi } = await import("../../../../convex/_generated/api");
        const inputTokens = Math.max(1, Math.floor(ctx.userMessage.length / 4));
        const outputTokens = Math.max(1, Math.floor(answer.length / 4));
        await convexClient.mutation(convexApi.tokenUsage.track, {
          userId: ctx.userId,
          tier: ctx.tier,
          inputTokens,
          outputTokens,
          model: "gpt-5.4",
          agentSlug: "llp-chat-followup",
          turn: 2,
          stream: 2,
        });
      } catch { /* ignore */ }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

// ── Deep Search (turn-2+ opt-in) ─────────────────────────────────────
// Pipeline: chat-proxy /search (fresh retrieval) → llp-chat-followup
// (draft, data-blind, receives enriched verbatim) → parallel
// llp-chat-verify per cited section (audit against corpus read_file)
// → gate the draft (drop unverified citations, mark each one with the
// verify verdict) → stream the draft as text + emit one
// `deep_search_report` NDJSON event with per-claim verdicts. The
// orchestrator-side heuristic auto-verify (`shouldAutoVerify`) is
// intentionally skipped — Deep Search verifies exhaustively, so the
// single-claim heuristic would just double-fire verify.
/**
 * PB Task 4 (E3) — non-streaming consumer for the recovery re-fire.
 *
 * Drains an NDJSON ReadableStream from chat-proxy and returns the
 * accumulated answer text + the latest non-empty citations array.
 * Tolerates malformed lines (chat-proxy NDJSON spec is permissive).
 *
 * The recovery path consumes the chat-proxy response off-stream — the
 * UI has already been served the original answer; we only need the
 * recovered text + citations for the F1 corrector (Task 6).
 */
async function collectStreamPayload(
  body: ReadableStream<Uint8Array>,
): Promise<{ text: string; citations: unknown[] }> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let citations: unknown[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    lines.forEach((line) => {
      if (!line.trim()) return;
      try {
        const ev = JSON.parse(line);
        if (ev.type === "text" && typeof ev.content === "string") {
          text += ev.content;
        }
        // chat-proxy emits citations via `meta_update.citations` AND
        // standalone `citations` events; last-write-wins matches the
        // streaming path. The initial `meta` event carries only
        // {conversation_id, tier, model} and never carries citations —
        // citations land later via `meta_update`.
        if (ev.type === "meta_update" && Array.isArray(ev.citations) && ev.citations.length > 0) {
          citations = ev.citations;
        }
        if (ev.type === "citations" && Array.isArray(ev.citations) && ev.citations.length > 0) {
          citations = ev.citations;
        }
      } catch {
        // Ignore parse errors on malformed lines.
      }
    });
  }
  // Flush trailing buffer: chat-proxy may close the stream without a
  // terminating newline. Without this, the final NDJSON event (often
  // the citations payload) is silently dropped.
  if (buf.trim()) {
    try {
      const ev = JSON.parse(buf);
      if (ev.type === "text" && typeof ev.content === "string") {
        text += ev.content;
      }
      if (ev.type === "meta_update" && Array.isArray(ev.citations) && ev.citations.length > 0) {
        citations = ev.citations;
      }
      if (ev.type === "citations" && Array.isArray(ev.citations) && ev.citations.length > 0) {
        citations = ev.citations;
      }
    } catch {
      // Ignore — final partial line may be truncated mid-write.
    }
  }
  return { text, citations };
}

async function callOrchestratorDeepSearch(
  ctx: ContinuationContext,
): Promise<Response> {
  const DEEP_PROXY_URL = process.env.CHAT_PROXY_URL;
  const DEEP_PROXY_KEY = process.env.CHAT_PROXY_API_KEY || "";
  if (!DEEP_PROXY_URL) {
    // Deep Search fallback: route through standard Anthropic continuation
    console.log("[chat] deep-search · CHAT_PROXY_URL not set — falling back to standard continuation");
    return callOrchestratorContinuation(ctx);
  }
  const DEEP_VERIFY_CONCURRENCY = 3;
  // 200s budget: empirical Opus runs over corpus reads land at 60-120s
  // (registry + 1-2 trees + indexes). 30s was tripping `signal: killed`
  // mid-read. 200s leaves headroom to finish + buffers against
  // orchestrator queue waits, while keeping pipeline total
  //   search(20) + draft(60) + parallel verify(200) ≈ 280s
  // under Vercel's 300s function cap.
  const DEEP_VERIFY_PER_MS = 200_000;
  const DEEP_SEARCH_TIMEOUT_MS = 20_000;

  const encoder = new TextEncoder();
  const write = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    obj: unknown,
  ) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

  // Verify now reads the corpus directly from the inference container's
  // bind-mounted corpus path. The orchestrator no longer proxies
  // evidence — verify fetches its own source text via `read_file` and
  // reasons against the files. Payload carries only the claim +
  // expected_section + conversation_context.

  type DeepVerifyVerdict = {
    document_id: string;
    section: string;
    verdict: "agree" | "disagree" | "partial" | "not_verifiable";
    section_corrected?: string | null;
    result_summary: string;
  };

  // Shape the server-side verdicts into the same claim+overall shape
  // the client store derives in chat-store.ts (setMessageVerifyReport
  // path). Doing it here once lets us persist a consumer-ready record
  // that renders identically in the PDF print page, the Verify
  // result card, and any later hydrator without re-mapping per reader.
  const buildVerifyReport = (verdicts: DeepVerifyVerdict[]) => {
    const CLAIM_VERDICT_MAP: Record<string, string> = {
      agree: "verified",
      partial: "partially_correct",
      disagree: "fabricated",
      not_verifiable: "unknown",
    };
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
    const claims = verdicts.map((v) => ({
      cited_section:
        [v.document_id, v.section].filter(Boolean).join(" ").trim() ||
        undefined,
      verdict: CLAIM_VERDICT_MAP[v.verdict] ?? "unknown",
      explanation:
        typeof v.result_summary === "string" ? v.result_summary : undefined,
    }));
    let worstClaim = "verified";
    let worstSev = -1;
    for (const c of claims) {
      const sev = CLAIM_SEVERITY[c.verdict] ?? 0;
      if (sev > worstSev) {
        worstSev = sev;
        worstClaim = c.verdict;
      }
    }
    const allVerified =
      claims.length > 0 && claims.every((c) => c.verdict === "verified");
    const overall_verdict = allVerified
      ? "verified"
      : CLAIM_TO_OVERALL[worstClaim] ?? "unknown";
    return { overall_verdict, claims, source: "deep_search" as const };
  };

  // Persist the Deep-Search turn so a page refresh, share link, or
  // PDF export can rebuild the exchange (answer + verify card) from
  // Postgres instead of the ephemeral client store. Safe to call once
  // per turn — challenge and fresh branches each call it inside their
  // stream.start(). Returns the DB ids so we can emit
  // `assistant_persisted` and let the client remap its temp ids.
  const persistDeepTurn = async (args: {
    answer: string;
    /** English source-of-truth when the user's chat language is non-EN.
     *  Stored in messages.content_en so the translation overlay + future
     *  language-switch retranslations have a canonical source. */
    englishAnswer?: string;
    citations: Array<{
      section?: string;
      document?: string;
      document_id?: string;
      text?: string;
    }>;
    verdicts: DeepVerifyVerdict[];
    mode: "fresh" | "challenge";
  }): Promise<{ user_id: string | null; assistant_id: string | null }> => {
    try {
      const sb = createServerClient();
      const title =
        ctx.userMessage.length > 60
          ? ctx.userMessage.slice(0, 57) + "..."
          : ctx.userMessage;
      await sb
        .from("conversations")
        .upsert(
          {
            id: ctx.convId,
            user_id: ctx.userId,
            title,
            language: ctx.chatLanguage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      const verify_report = buildVerifyReport(args.verdicts);
      const isTranslated =
        ctx.chatLanguage !== "en" &&
        typeof args.englishAnswer === "string" &&
        args.englishAnswer.length > 0 &&
        args.englishAnswer !== args.answer;
      const { data: inserted, error: insErr } = await sb
        .from("messages")
        .insert([
          {
            conversation_id: ctx.convId,
            role: "user",
            content: ctx.userMessage,
            language: ctx.chatLanguage,
          },
          {
            conversation_id: ctx.convId,
            role: "assistant",
            content: args.answer,
            content_en: isTranslated ? args.englishAnswer : null,
            language: ctx.chatLanguage,
            citations: args.citations,
            verify_report,
          },
        ])
        .select("id, role");
      if (insErr) {
        console.error("[chat/deep-search] messages.insert failed", {
          convId: ctx.convId,
          mode: args.mode,
          insErr,
        });
        return { user_id: null, assistant_id: null };
      }
      return {
        user_id: inserted?.find((m) => m.role === "user")?.id ?? null,
        assistant_id:
          inserted?.find((m) => m.role === "assistant")?.id ?? null,
      };
    } catch (err) {
      console.error("[chat/deep-search] persist threw", err);
      return { user_id: null, assistant_id: null };
    }
  };

  // Extract the root section number so §264, §264(10), §264(11) all
  // hash to the same key and batch into one verify call. Opus then
  // reads /app/projects/llp-corpus/DOC-010/section-264.txt once instead of three
  // times. "264(10)" → "264"; "11A" → "11A".
  const rootSectionKey = (section: string | null | undefined): string => {
    if (typeof section !== "string") return "";
    const m = section.match(/(\d+[A-Z]?)/i);
    return m ? m[1].toUpperCase() : section.trim();
  };

  // Run verify with per-file batching. Citations that share a
  // {document_id, root_section} hit one Opus call together; distinct
  // files still fan out in parallel. Output is one DeepVerifyVerdict
  // per input citation, preserving input order via `c<index>` claim
  // ids.
  const runVerifyBatch = async (
    citations: ContinuationCitation[],
    buildClaim: (c: ContinuationCitation, expectedSection: string) => string,
    conversationContext: string[],
  ): Promise<DeepVerifyVerdict[]> => {
    if (citations.length === 0) return [];

    const claimByIndex: VerifyClaim[] = citations.map((c, i) => {
      const expectedSection =
        normalizeSchemaSection(c.section, c.document_id) ?? c.section ?? "";
      return {
        id: `c${i}`,
        claim: buildClaim(c, expectedSection),
        expected_section: expectedSection,
      };
    });

    const groups = new Map<string, VerifyClaim[]>();
    citations.forEach((c, i) => {
      const docId = typeof c.document_id === "string" ? c.document_id : "";
      const rootKey = rootSectionKey(
        typeof c.section === "string" ? c.section : "",
      );
      const key = `${docId}::${rootKey}`;
      const existing = groups.get(key);
      if (existing) existing.push(claimByIndex[i]);
      else groups.set(key, [claimByIndex[i]]);
    });

    const perGroupResults = await Promise.all(
      Array.from(groups.values()).map(async (
        groupClaims,
      ): Promise<BatchVerdict[]> => {
        const verifyInput = buildVerifyUserMessage({
          claims: groupClaims,
          conversation_context: conversationContext,
        });
        const res = await callOrchestratorContinuationAgent(verifyInput, {
          agent_override: VERIFY_AGENT,
          timeout_ms: DEEP_VERIFY_PER_MS,
        });
        if (!res.ok) {
          const reason = `Verify unavailable: ${res.error.slice(0, 80)}`;
          return groupClaims.map((cl) => ({
            id: cl.id,
            verdict: "not_verifiable" as const,
            section: cl.expected_section || null,
            section_corrected: null,
            result_summary: reason,
          }));
        }
        return parseVerifyBatch(res.content, groupClaims);
      }),
    );

    const byId = new Map<string, BatchVerdict>();
    for (const group of perGroupResults) {
      for (const v of group) byId.set(v.id, v);
    }

    return citations.map((c, i): DeepVerifyVerdict => {
      const v = byId.get(`c${i}`);
      return {
        document_id: c.document_id ?? "",
        section: c.section ?? "",
        verdict: v?.verdict ?? "not_verifiable",
        section_corrected: v?.section_corrected ?? null,
        result_summary:
          v?.result_summary ?? "Verify returned no verdict for this claim.",
      };
    });
  };

  // ── Challenge mode ────────────────────────────────────────────────
  // When the user message is a bare challenge ("are you sure?",
  // "really?", "but HR said...") AND a prior assistant turn with
  // citations exists, the standard Phase 1→4 pipeline starves Phase 3:
  //   search(query="are you sure?") → junk retrieval
  //   followup → hedges with no citations
  //   verify → empty (draftCitations = [])
  // → the user sees the hedge with no source check.
  //
  // Challenge-mode flips the pipeline:
  //   verify the PRIOR turn's citations (real ground truth) →
  //   feed verdicts as verbatim into followup →
  //   followup writes a confident reply quoting the verdicts.
  const priorAssistantTurn = [...ctx.resolvedHistory]
    .reverse()
    .find(
      (m) =>
        m.role === "assistant" &&
        typeof m.content === "string" &&
        m.content.trim().length > 0 &&
        Array.isArray(m.citations) &&
        m.citations.length > 0,
    );
  const challengeMode =
    looksLikeChallenge(ctx.userMessage) && priorAssistantTurn != null;

  if (challengeMode && priorAssistantTurn) {
    const priorCitations = (priorAssistantTurn.citations ?? []).slice(
      0,
      DEEP_VERIFY_CONCURRENCY,
    );
    const priorContent =
      typeof priorAssistantTurn.content === "string"
        ? priorAssistantTurn.content
        : "";

    const conversationContext = ctx.resolvedHistory.slice(-6).map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      const content =
        typeof m.content === "string" ? m.content.slice(0, 400) : "";
      return `${role}: ${content}`;
    });

    const verdicts: DeepVerifyVerdict[] = await runVerifyBatch(
      priorCitations,
      (c) =>
        `Prior assistant asserted about ${c.section}${
          c.document ? ` (${c.document})` : ""
        }: "${priorContent.slice(0, 500)}". User now challenges: "${ctx.userMessage.slice(0, 160)}". Verify the assertion against the corpus.`,
      conversationContext,
    ).catch((err): DeepVerifyVerdict[] =>
      priorCitations.map((c): DeepVerifyVerdict => ({
        document_id: c.document_id ?? "",
        section: c.section ?? "",
        verdict: "not_verifiable",
        section_corrected: null,
        result_summary: `Verify threw: ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`,
      })),
    );

    // Feed verify verdicts to the followup as verbatim entries. The
    // synthesis prompt is the standard continuation prompt, but the
    // verbatim is the verdicts themselves so followup writes "Verified
    // §X: ... per the source check" instead of hedging from memory.
    const verdictVerbatim: ContinuationCitation[] = verdicts.map((v) => {
      const matching = priorCitations.find(
        (c) =>
          (c.document_id ?? "") === v.document_id &&
          (c.section ?? "") === v.section,
      );
      const verdictLabel = v.verdict.toUpperCase();
      return {
        section: v.section_corrected ?? v.section,
        document: matching?.document ?? "",
        document_id: v.document_id,
        text: `[VERIFY ${verdictLabel}] ${v.result_summary}`,
      };
    });
    const priorVerbatimForChallenge = await getSourceCitationsVerbatim(ctx);
    const mergedChallengeVerbatim = [
      ...verdictVerbatim,
      ...priorVerbatimForChallenge,
    ].slice(0, 12);

    const synthUserMsg = buildContinuationUserMessage(
      ctx.userMessage,
      ctx.resolvedHistory,
      ctx.language,
      mergedChallengeVerbatim,
      ctx.chatLanguage,
    );
    const synthRes = await callOrchestratorContinuationAgent(synthUserMsg, {
      timeout_ms: CONTINUATION_TIMEOUT_MS,
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        if (!synthRes.ok) {
          console.error("[chat] deep_search_challenge_synth_failed:", synthRes);
          write(controller, {
            type: "error",
            message: "deep_search_challenge_synth_failed",
          });
          write(controller, { type: "done" });
          controller.close();
          return;
        }
        const parsed = extractContinuationObject(synthRes.content);
        const answer =
          parsed && typeof parsed.answer === "string" ? parsed.answer : "";
        const synthCitations = (parsed?.citations ?? []).filter(
          (c): c is ContinuationCitation =>
            !!c && typeof c === "object" && typeof c.section === "string",
        );
        if (!answer) {
          write(controller, {
            type: "error",
            message: "deep_search_challenge_parse_failed",
          });
          write(controller, { type: "done" });
          controller.close();
          return;
        }
        // Backstop translation: if the agent ignored the response_language
        // directive (gpt-5.4 occasionally writes English on a BN chat),
        // translate through Gemini before emitting — same safety net the
        // non-Deep continuation path uses at L831.
        const englishAnswer = answer;
        let renderedAnswer = englishAnswer;
        if (ctx.chatLanguage !== "en") {
          write(controller, { type: "translating", language: ctx.chatLanguage });
          renderedAnswer = await translateChunk(englishAnswer, {
            language: ctx.chatLanguage,
          });
        }
        write(controller, { type: "text", content: renderedAnswer });
        if (ctx.chatLanguage !== "en" && renderedAnswer !== englishAnswer) {
          write(controller, { type: "source_en", content: englishAnswer });
        }

        // Drop disagree citations from the meta_update so the bubble
        // doesn't display sources verify rejected.
        const agreeing = synthCitations.filter((c) => {
          const v = verdicts.find(
            (x) =>
              x.document_id === (c.document_id ?? "") &&
              x.section === (c.section ?? ""),
          );
          return !v || v.verdict !== "disagree";
        });
        write(controller, {
          type: "meta_update",
          citations: agreeing.map((c) => ({
            section: c.section,
            document: c.document,
            document_id: c.document_id,
            text: typeof c.text === "string" ? c.text.slice(0, 600) : "",
          })),
        });

        write(controller, {
          type: "deep_search_report",
          verdicts,
          checked_count: verdicts.length,
          draft_citation_count: priorCitations.length,
          mode: "challenge",
        });

        const persisted = await persistDeepTurn({
          answer: renderedAnswer,
          englishAnswer,
          citations: agreeing.map((c) => ({
            section: c.section,
            document: c.document,
            document_id: c.document_id,
            text: typeof c.text === "string" ? c.text.slice(0, 600) : "",
          })),
          verdicts,
          mode: "challenge",
        });
        if (persisted.assistant_id) {
          write(controller, {
            type: "assistant_persisted",
            assistant_id: persisted.assistant_id,
            user_id: persisted.user_id,
          });
        }

        write(controller, { type: "done" });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  }

  // Phase 1 — fresh retrieval against the corpus.
  let freshContext = "";
  let freshVerbatim: ContinuationCitation[] = [];
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (DEEP_PROXY_KEY) headers.Authorization = `Bearer ${DEEP_PROXY_KEY}`;
    headers["X-Forwarded-User-Id"] = shortId(ctx.userId);
    const searchRes = await fetch(`${DEEP_PROXY_URL}/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: ctx.userMessage }),
      signal: AbortSignal.timeout(DEEP_SEARCH_TIMEOUT_MS),
    });
    if (searchRes.ok) {
      const data = (await searchRes.json()) as {
        nodes?: Array<{ id: string; title: string; hasContent?: boolean }>;
        context?: string;
      };
      freshContext =
        typeof data.context === "string" ? data.context.slice(0, 12_000) : "";
      freshVerbatim = (data.nodes || []).slice(0, 8).map((n) => ({
        section: n.title,
        document: "",
        document_id: n.id,
        text: freshContext ? freshContext.slice(0, 400) : "",
      }));
    } else {
      console.warn(
        `[deep-search] /search failed status=${searchRes.status}`,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[deep-search] /search threw: ${msg}`);
  }

  // Merge prior-turn verbatim with fresh retrieval so the draft sees
  // both the user's prior-answer context AND newly retrieved source.
  const priorVerbatim = await getSourceCitationsVerbatim(ctx);
  const mergedVerbatim = [...freshVerbatim, ...priorVerbatim].slice(0, 12);

  // Phase 2 — data-blind draft via llp-chat-followup.
  const draftUserMsg = buildContinuationUserMessage(
    ctx.userMessage,
    ctx.resolvedHistory,
    ctx.language,
    mergedVerbatim,
    ctx.chatLanguage,
  );
  const draftRes = await callOrchestratorContinuationAgent(draftUserMsg, {
    timeout_ms: CONTINUATION_TIMEOUT_MS,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!draftRes.ok) {
        console.error("[chat] deep_search_draft_failed:", draftRes);
        write(controller, {
          type: "error",
          message: "deep_search_draft_failed",
        });
        write(controller, { type: "done" });
        controller.close();
        return;
      }
      const parsed = extractContinuationObject(draftRes.content);
      if (!parsed || typeof parsed.answer !== "string") {
        write(controller, {
          type: "error",
          message: "deep_search_parse_failed",
        });
        write(controller, { type: "done" });
        controller.close();
        return;
      }
      const answer = parsed.answer;
      const draftCitations = (parsed.citations ?? []).filter(
        (c): c is ContinuationCitation =>
          !!c && typeof c === "object" && typeof c.section === "string",
      );

      // Backstop translation — see challenge branch above for rationale.
      const englishAnswer = answer;
      let renderedAnswer = englishAnswer;
      if (ctx.chatLanguage !== "en") {
        write(controller, { type: "translating", language: ctx.chatLanguage });
        renderedAnswer = await translateChunk(englishAnswer, {
          language: ctx.chatLanguage,
        });
      }

      // Stream the draft text as a single text event for now — the UI
      // treats this like any other turn-2 answer. Future work: chunk
      // text during the verify phase for faster time-to-first-paint.
      write(controller, { type: "text", content: renderedAnswer });
      if (ctx.chatLanguage !== "en" && renderedAnswer !== englishAnswer) {
        write(controller, { type: "source_en", content: englishAnswer });
      }

      // Phase 3 — verify each citation in parallel (capped).
      const selected = draftCitations.slice(0, DEEP_VERIFY_CONCURRENCY);
      const conversationContext = ctx.resolvedHistory.slice(-6).map((m) => {
        const role = m.role === "user" ? "User" : "Assistant";
        const content =
          typeof m.content === "string" ? m.content.slice(0, 400) : "";
        return `${role}: ${content}`;
      });

      const verdicts: DeepVerifyVerdict[] = await runVerifyBatch(
        selected,
        (c) =>
          `${answer.slice(0, 400)} — specifically claim about ${c.section ?? ""}${c.document ? ` (${c.document})` : ""}`,
        conversationContext,
      ).catch((err): DeepVerifyVerdict[] =>
        selected.map((c): DeepVerifyVerdict => ({
          document_id: c.document_id ?? "",
          section: c.section ?? "",
          verdict: "not_verifiable",
          section_corrected: null,
          result_summary: `Verify threw: ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`,
        })),
      );

      // Phase 4 — emit the gated citation list (drop `disagree`; keep
      // the rest but annotate). The draft text has already streamed,
      // so downstream `meta_update` callers still see citations on the
      // message; the deep_search_report carries per-claim verdicts for
      // the inline card.
      const agreeing = draftCitations.filter((c) => {
        const v = verdicts.find(
          (x) => x.document_id === (c.document_id ?? "") && x.section === (c.section ?? ""),
        );
        return !v || v.verdict !== "disagree";
      });
      write(controller, {
        type: "meta_update",
        citations: agreeing.map((c) => ({
          section: c.section,
          document: c.document,
          document_id: c.document_id,
          text: typeof c.text === "string" ? c.text.slice(0, 600) : "",
        })),
      });

      write(controller, {
        type: "deep_search_report",
        verdicts,
        checked_count: verdicts.length,
        draft_citation_count: draftCitations.length,
      });

      // G1 Honesty Guard — surface verify-verdict gaps to the user as a
      // severity-tagged banner above the answer. Flag-gated so prod stays
      // at the held-out 96.7% baseline until we ship Phase-B Task 1's
      // eval gate. Wire-side verdicts use "agree"; the pure function uses
      // "verifies" — adapt at the boundary, keep computeConfidenceBand
      // free of orchestrator-specific verdict naming.
      if (process.env.ENABLE_HONESTY_GUARD === "1") {
        const adapted: Verdict[] = verdicts.map((v) => ({
          verdict: v.verdict === "agree" ? "verifies" : v.verdict,
          section: v.section,
          document_id: v.document_id,
        }));
        const band = computeConfidenceBand(adapted);
        if (band) {
          write(controller, { type: "confidence_band", payload: band });
        }
      }

      const persisted = await persistDeepTurn({
        answer: renderedAnswer,
        englishAnswer,
        citations: agreeing.map((c) => ({
          section: c.section,
          document: c.document,
          document_id: c.document_id,
          text: typeof c.text === "string" ? c.text.slice(0, 600) : "",
        })),
        verdicts,
        mode: "fresh",
      });
      if (persisted.assistant_id) {
        write(controller, {
          type: "assistant_persisted",
          assistant_id: persisted.assistant_id,
          user_id: persisted.user_id,
        });
      }

      write(controller, { type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth + Tier ──
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    let tier: Tier = "free_subscribed";
    let isAdmin = false;
    try {
      const user = await currentUser();
      const metadata = user?.publicMetadata as ClerkTierMetadata & { role?: string; contributor?: boolean } | undefined;
      if (metadata?.tier) tier = resolveTier(metadata);
      isAdmin = metadata?.role === "admin" || metadata?.contributor === true;
    } catch {}

    // ── 2. Rate Limit ──
    const tierConfig = await getTierConfigAsync(tier);
    const { allowed: rateLimitAllowed, resetMs } = await checkRateLimit(userId, tierConfig.rateLimit);
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(Math.ceil(Math.max(0, resetMs - Date.now()) / 1000)) } });
    }

    const {
      message,
      history,
      conversation_id,
      tier_override,
      system_prompt_override,
      language: requestedLanguage,
      deep_search: requestedDeepSearch,
    } = await req.json();
    const deepSearchRequested = requestedDeepSearch === true;
    if (!message || typeof message !== "string") return NextResponse.json({ error: "Message is required" }, { status: 400 });

    // ── Resolve response language ──
    // Priority: explicit request → existing conversation → user preference → 'en'.
    // We resolve it here (after auth, before tier checks) so every downstream
    // path (cache, continuation, proxy) sees the same value.
    const supabaseForLang = createServerClient();
    let chatLanguage: string =
      isSupportedLanguage(requestedLanguage) && typeof requestedLanguage === "string"
        ? requestedLanguage
        : DEFAULT_CHAT_LANGUAGE;
    if (!isSupportedLanguage(requestedLanguage)) {
      // No explicit pick — try existing conversation's language first.
      if (conversation_id) {
        try {
          const { data: convRow } = await supabaseForLang
            .from("conversations")
            .select("language, user_id")
            .eq("id", conversation_id)
            .maybeSingle();
          if (convRow && convRow.user_id === userId && isSupportedLanguage(convRow.language)) {
            chatLanguage = convRow.language as string;
          }
        } catch { /* fall through */ }
      }
      // Fall back to user-saved default.
      if (chatLanguage === DEFAULT_CHAT_LANGUAGE) {
        try {
          const { data: prefRow } = await supabaseForLang
            .from("user_preferences")
            .select("preferred_chat_language")
            .eq("user_id", userId)
            .maybeSingle();
          if (prefRow && isSupportedLanguage(prefRow.preferred_chat_language)) {
            chatLanguage = prefRow.preferred_chat_language as string;
          }
        } catch { /* fall through to 'en' */ }
      }
    }

    // Admin tier override for sandbox testing
    if (tier_override && isAdmin) {
      tier = tier_override as Tier;
      console.log("[chat] Admin tier override:", tier_override);
    }

    // ── 3. Daily Limit ──
    let dailyUsage = { requestCount: 0 };
    try {
      const { ConvexHttpClient } = await import("convex/browser");
      const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      const { api: convexApi } = await import("../../../../convex/_generated/api");
      const usage = await convexClient.query(convexApi.tokenUsage.getToday, { userId });
      if (usage) dailyUsage = { requestCount: usage.requestCount };
    } catch {}

    const requestLimitCheck = await checkDailyRequestLimitAsync(tier, dailyUsage.requestCount);
    // Skip daily limit enforcement for admin sandbox testing
    if (!(tier_override && isAdmin)) {
      if (!requestLimitCheck.allowed) {
        const ctaMsg = tier !== "max" ? CTA_MESSAGES[tier as Exclude<Tier, "max">] : null;
        return NextResponse.json({ error: `Daily limit reached (${requestLimitCheck.limit}).`, cta: ctaMsg?.text }, { status: 429 });
      }
    }

    // ── 4. Cache check (community-validated) ──
    const hash = queryHash(message);
    try {
      const cached = await checkCacheHit(hash);
      if (cached) {
        console.log("[chat] Cache HIT (community-validated):", hash.slice(0, 12));
        const cacheConvId = conversation_id || crypto.randomUUID();
        const dailyRemaining = requestLimitCheck.limit - dailyUsage.requestCount - 1;

        // Translate cached English response if user wants a different language.
        // Cached responses are always stored in English (source-of-truth).
        const englishCached = cached.response;
        let renderedCached = englishCached;
        if (chatLanguage !== "en") {
          renderedCached = await translateChunk(englishCached, { language: chatLanguage });
        }
        const isTranslated = chatLanguage !== "en" && renderedCached !== englishCached;

        const enc = new TextEncoder();
        const cacheStream = new ReadableStream({
          start(controller) {
            controller.enqueue(enc.encode(JSON.stringify({ type: "meta", conversation_id: cacheConvId, tier, dailyRemaining: Math.max(0, dailyRemaining), cached: true, language: chatLanguage }) + "\n"));
            controller.enqueue(enc.encode(JSON.stringify({ type: "text", content: renderedCached }) + "\n"));
            if (isTranslated) {
              controller.enqueue(enc.encode(JSON.stringify({
                type: "source_en",
                content: englishCached,
              }) + "\n"));
            }
            if (cached.citations?.length > 0) {
              controller.enqueue(enc.encode(JSON.stringify({ type: "meta_update", citations: cached.citations }) + "\n"));
            }
            const title = message.length > 60 ? message.slice(0, 57) + "..." : message;
            controller.enqueue(enc.encode(JSON.stringify({ type: "title_update", conversation_id: cacheConvId, title }) + "\n"));
            controller.close();
            // Persist conversation even for cached responses
            const sb = createServerClient();
            sb.from("conversations").upsert({ id: cacheConvId, user_id: userId, title, language: chatLanguage, updated_at: new Date().toISOString() }, { onConflict: "id" }).then(null, () => {});
            sb.from("messages").insert([
              { conversation_id: cacheConvId, role: "user", content: message, language: chatLanguage },
              {
                conversation_id: cacheConvId,
                role: "assistant",
                content: renderedCached,
                content_en: isTranslated ? englishCached : null,
                language: chatLanguage,
                citations: cached.citations,
              },
            ]).select("id, role").then(({ data: rows }) => {
              if (isTranslated) {
                const aiId = rows?.find((r) => r.role === "assistant")?.id;
                if (aiId) {
                  sb.from("message_translations").upsert({
                    message_id: aiId,
                    language: chatLanguage,
                    translated_content: renderedCached,
                  }, { onConflict: "message_id,language" }).then(null, () => {});
                }
              }
            }, () => {});
            // Track usage for cached responses too (English source for billing parity)
            (async () => {
              try {
                const { ConvexHttpClient } = await import("convex/browser");
                const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
                const { api: convexApi } = await import("../../../../convex/_generated/api");
                // Cache hit on turn-1 — no Grok call happened, but record
                // what it would have cost so per-agent counts stay honest.
                // chars/4 floored placeholder (P4 will wire real usage).
                const inputTokens = Math.max(1, Math.floor(message.length / 4));
                const outputTokens = Math.max(1, Math.floor(englishCached.length / 4));
                await convexClient.mutation(convexApi.tokenUsage.track, {
                  userId,
                  tier,
                  inputTokens,
                  outputTokens,
                  model: "grok-4-1-fast-reasoning",
                  agentSlug: "chat-proxy-grok",
                  turn: 1,
                  stream: 1,
                });
              } catch {}
            })();
          },
        });
        return new Response(cacheStream, { headers: { "Content-Type": "application/x-ndjson", "Transfer-Encoding": "chunked", "Cache-Control": "no-cache" } });
      }
    } catch (cacheErr) {
      console.error("[chat] Cache read error:", cacheErr);
    }

    const supabase = createServerClient();

    // ── Server-side history fallback ──
    let resolvedHistory = history || [];
    if (resolvedHistory.length === 0 && conversation_id) {
      try {
        // Verify conversation belongs to this user before fetching history
        const { data: conv } = await supabase
          .from("conversations")
          .select("user_id")
          .eq("id", conversation_id)
          .single();
        if (conv && conv.user_id === userId) {
          const { data: prevMessages } = await supabase
            .from("messages")
            .select("role, content, citations")
            .eq("conversation_id", conversation_id)
            .order("created_at", { ascending: true })
            .limit(10);
          if (prevMessages && prevMessages.length > 0) {
            resolvedHistory = prevMessages;
          }
        }
      } catch {}
    }

    // ── 5a. Intent classification (Gemini Flash, ~100 tokens, <1s) ──
    let classification: IntentClassification;
    try {
      classification = await classifyIntent(message);
    } catch {
      classification = {
        intents: ["FACTUAL"],
        primary_intent: "FACTUAL",
        domain: "other",
        cross_domains: [],
        urgency: "general",
        language: /[\u0980-\u09FF]/.test(message) ? "bangla" : "english",
        requires_file: false,
        perspective: "neutral",
      };
    }

    // ── 5b. Handle non-question inputs ──
    // Only short-circuit on turn-1. On turn-2+ the user message can
    // legitimately be a bare challenge ("are you sure?", "really?",
    // "but HR said...") — the classifier flags those as NOT_A_QUESTION
    // because they have no legal terms, but the followup / Deep Search
    // path uses prior assistant context to handle them. Skipping here
    // routes the challenge through to llp-chat-followup (or the verify
    // pipeline when Deep Search is on).
    const hasPriorAssistantTurn = Array.isArray(history)
      && history.some(
        (m: { role?: string; content?: string }) =>
          m?.role === "assistant" &&
          typeof m?.content === "string" &&
          m.content.trim().length > 0,
      );
    if (classification.primary_intent === "NOT_A_QUESTION" && !hasPriorAssistantTurn) {
      const clarifyMsg = "I didn't detect a legal question. Could you rephrase your query? For example: \"What is the notice period for termination?\" or \"Is overtime mandatory?\"";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: "text", content: clarifyMsg }) + "\n"));
          controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          controller.close();
        },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Transfer-Encoding": "chunked" } });
    }

    // ── 5c. Build behavioral system prompt (v2) ──
    const { blockedIntents } = await checkIntentAccessAsync(tier, classification);
    let systemPrompt: string;
    if (system_prompt_override && isAdmin) {
      // Sandbox: inject tier-specific rules on top of custom prompt
      const tierBlock = buildTierBlock(tier, blockedIntents);
      systemPrompt = system_prompt_override + "\n" + tierBlock;
    } else {
      systemPrompt = buildSystemPrompt(tier, classification, blockedIntents);
    }


    // ── 5d-bis. Turn-based routing — Grok (turn 1) vs GPT continuation (turn 2+) ──
    // `resolvedHistory` has already been normalized above (client-supplied +
    // Supabase fallback). A conversation is on turn 2+ iff it already has at
    // least one assistant message *with prose content* in history.
    //
    // Empty-content assistant turns come from the turn-1 clarify-cards path
    // (content is blanked when the model emits `clarify_options`). Those are
    // disambiguation placeholders, not real answers — the follow-up scenario
    // query still needs full RAG grounding, so route it as turn-1.
    const isFirstTurn =
      (resolvedHistory ?? []).filter(
        (m: { role?: string; content?: string }) =>
          m.role === "assistant" &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      ).length === 0;

    if (!isFirstTurn) {
      const convIdContinuation = conversation_id || crypto.randomUUID();
      const dailyRemainingContinuation = requestLimitCheck.limit - dailyUsage.requestCount - 1;
      const continuationLanguage: "en" | "bn" = classification.language === "bangla" ? "bn" : "en";

      const ctxBase: ContinuationContext = {
        userMessage: message,
        resolvedHistory,
        language: continuationLanguage,
        chatLanguage,
        convId: convIdContinuation,
        tier,
        dailyRemaining: dailyRemainingContinuation,
        userId,
        conversationId: conversation_id,
        queryHashValue: hash,
        supabaseClient: supabase,
        deepSearch: deepSearchRequested,
      };

      if (deepSearchRequested) {
        console.log(`[chat] turn=2+ · routing to Deep Search · user=${shortId(userId)} conv=${shortId(convIdContinuation)}`);
        return callOrchestratorDeepSearch(ctxBase);
      }

      console.log(`[chat] turn=2+ · routing to orchestrator continuation · user=${shortId(userId)} conv=${shortId(convIdContinuation)}`);
      return callOrchestratorContinuation(ctxBase);
    }

    console.log(`[chat] turn=1 · routing to chat-proxy (Grok) · user=${shortId(userId)}`);

    // ── 5e. Call chat-proxy (tree reasoning + RAG + z.ai) ──
    const CHAT_PROXY_URL = process.env.CHAT_PROXY_URL;
    const CHAT_PROXY_API_KEY = process.env.CHAT_PROXY_API_KEY || "";
    if (!CHAT_PROXY_URL) {
      // ── Anthropic direct fallback (no chat-proxy configured) ──
      console.log(`[chat] turn=1 · CHAT_PROXY_URL not set — falling back to Anthropic direct`);
      const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
      if (!ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
      }
      const fallbackEncoder = new TextEncoder();
      const fallbackConvId = conversation_id || crypto.randomUUID();
      const fallbackDailyRemaining = requestLimitCheck.limit - dailyUsage.requestCount - 1;
      const fallbackMessages = [
        ...((resolvedHistory || []).slice(-8).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: typeof m.content === "string" ? m.content : "",
        }))),
        { role: "user" as const, content: message },
      ];
      const fallbackStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(fallbackEncoder.encode(JSON.stringify({
            type: "meta",
            conversation_id: fallbackConvId,
            tier,
            dailyRemaining: Math.max(0, fallbackDailyRemaining),
            language: chatLanguage,
          }) + "\n"));
          try {
            const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4096,
                system: systemPrompt,
                messages: fallbackMessages,
                stream: true,
              }),
            });
            if (!anthropicRes.ok || !anthropicRes.body) {
              const errText = await anthropicRes.text().catch(() => "");
              console.error("[chat] Anthropic fallback error:", anthropicRes.status, errText.slice(0, 200));
              controller.enqueue(fallbackEncoder.encode(JSON.stringify({ type: "error", message: "AI service temporarily unavailable." }) + "\n"));
              controller.enqueue(fallbackEncoder.encode(JSON.stringify({ type: "done" }) + "\n"));
              controller.close();
              return;
            }
            const reader = anthropicRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let fullText = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("");
               buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6).trim();
                  if (data === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                      const chunk = parsed.delta.text;
                      fullText += chunk;
                      controller.enqueue(fallbackEncoder.encode(JSON.stringify({ type: "text", content: chunk }) + "\n"));
                    }
                  } catch { /* skip malformed */ }
                }
              }
            }
            const citations = extractCitations(fullText);
            if (citations.length > 0) {
              controller.enqueue(fallbackEncoder.encode(JSON.stringify({ type: "meta_update", citations }) + "\n"));
            }
            const title = message.length > 60 ? message.slice(0, 57) + "..." : message;
            controller.enqueue(fallbackEncoder.encode(JSON.stringify({ type: "title_update", conversation_id: fallbackConvId, title }) + "\n"));
            controller.enqueue(fallbackEncoder.encode(JSON.stringify({ type: "done" }) + "\n"));
            // Persist conversation
            const sb = createServerClient();
            sb.from("conversations").upsert({ id: fallbackConvId, user_id: userId, title, language: chatLanguage, updated_at: new Date().toISOString() }, { onConflict: "id" }).then(null, () => {});
            sb.from("messages").insert([
              { conversation_id: fallbackConvId, role: "user", content: message, language: chatLanguage },
              { conversation_id: fallbackConvId, role: "assistant", content: fullText, language: chatLanguage, citations },
            ]).then(null, () => {});
          } catch (err) {
            console.error("[chat] Anthropic fallback stream error:", err);
            controller.enqueue(fallbackEncoder.encode(JSON.stringify({ type: "error", message: "AI service error." }) + "\n"));
            controller.enqueue(fallbackEncoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          }
          controller.close();
        },
      });
      return new Response(fallbackStream, { headers: { "Content-Type": "application/x-ndjson", "Transfer-Encoding": "chunked", "Cache-Control": "no-cache" } });
    }
    const proxyHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (CHAT_PROXY_API_KEY) proxyHeaders["Authorization"] = `Bearer ${CHAT_PROXY_API_KEY}`;
    // Forward a stable user identifier so chat-proxy can rate-limit per user
    // instead of per shared NAT/CDN egress IP. shortId() is a SHA-256 prefix
    // of the Clerk userId, so the value is stable per user but does not leak
    // the raw Clerk ID into chat-proxy logs (M-6, M-13).
    proxyHeaders["X-Forwarded-User-Id"] = shortId(userId);

    const proxyRes = await fetch(`${CHAT_PROXY_URL}/chat`, {
      method: "POST",
      headers: proxyHeaders,
      body: JSON.stringify({
        query: message,
        history: (resolvedHistory || []).slice(-8),
        max_tokens: 4096,
        skip_audit: false,
        system_prompt: systemPrompt,
        domain: classification.domain,
        tier: "max",
      }),
      signal: AbortSignal.timeout(115000),
    });

    if (!proxyRes.ok || !proxyRes.body) {
      const errText = await proxyRes.text().catch(() => "");
      console.error("[chat] Proxy error:", proxyRes.status, errText.slice(0, 200));
      return NextResponse.json({ error: "AI service temporarily unavailable." }, { status: 502 });
    }

    // ── 6. Stream proxy NDJSON → frontend NDJSON ──
    // For non-English chats we accumulate English silently and translate at
    // paragraph boundaries via Gemini before emitting `text` events. Non-text
    // events (meta/citations/audit) are forwarded immediately either way.
    const encoder = new TextEncoder();
    const convId = conversation_id || crypto.randomUUID();
    const dailyRemaining = requestLimitCheck.limit - dailyUsage.requestCount - 1;
    const shouldTranslate = chatLanguage !== "en";

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({
          type: "meta",
          conversation_id: convId,
          tier,
          dailyRemaining: Math.max(0, dailyRemaining),
          language: chatLanguage,
        }) + "\n"));

        if (shouldTranslate) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: "translating",
            language: chatLanguage,
          }) + "\n"));
        }

        const reader = proxyRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let englishContent = "";
        let renderedContent = "";
        // Paragraph-pipelining buffer (translate path only)
        let translateBuf = "";
        // Clarify-mode capture — hoisted so the persist block at the end
        // of this scope can write them to the assistant message row.
        // Without this, empty-content clarify messages reload as empty
        // bubbles instead of re-rendering the card grid.
        let capturedClarifyOptions: Array<{
          title: string;
          role: string;
          blurb: string;
          scenario_query: string;
        }> | null = null;
        let capturedClarifyReason: string | null = null;
        // Pre-translation English capture — pivot used by the mid-session
        // language-switch route to retranslate cards into a new target
        // language. NULL when cards were emitted directly in English.
        let capturedClarifyOptionsEn: Array<{
          title: string;
          role: string;
          blurb: string;
          scenario_query: string;
        }> | null = null;
        let capturedClarifyReasonEn: string | null = null;
        // Agent-output events we forward transparently but also stash
        // so the persist block can write them to dedicated message
        // columns. Without this, the cards render once and vanish on
        // the next sidebar reload. Matched services ride the `meta`
        // event from chat-proxy; citations_audit is its own event.
        let capturedCitationsAudit: Record<string, unknown> | null = null;
        let capturedMatchedServices: unknown[] | null = null;
        // PB Task 3 (D1) — accumulate structured citations from chat-proxy
        // so we can run runTurn1VerifyBatch after the answer text streams.
        // The proxy emits citations via `meta.citations` + standalone
        // `citations` events; we keep the latest non-empty list (proxy
        // doesn't dedupe across emits, so last-write-wins matches what
        // the persist block ends up writing via extractCitations fallback).
        let capturedFirstTurnCitations: Turn1Citation[] = [];
        // PB Task 4 (E3) — accumulate any `coverage_additions` events
        // from the chat-proxy stream (emitted by the coverage_enforcer
        // guardrail). E3 unions these with D1 verdict corrections to
        // build the recovery re-fire augmented query.
        let coverageAdditions: Array<{ section: string; document_id: string }> = [];

        const flushParagraph = async (paragraph: string, trailingSep: string) => {
          // Empty paragraph (separator-only) — pass through to preserve spacing.
          if (!paragraph.trim()) {
            renderedContent += trailingSep;
            controller.enqueue(encoder.encode(JSON.stringify({ type: "text", content: trailingSep }) + "\n"));
            return;
          }
          const translated = await translateChunk(paragraph, { language: chatLanguage });
          const piece = translated + trailingSep;
          renderedContent += piece;
          controller.enqueue(encoder.encode(JSON.stringify({ type: "text", content: piece }) + "\n"));
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const event = JSON.parse(line);
                if (event.type === "text") {
                  englishContent += event.content;
                  if (!shouldTranslate) {
                    renderedContent += event.content;
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "text", content: event.content }) + "\n"));
                  } else {
                    translateBuf += event.content;
                    while (true) {
                      const idx = translateBuf.indexOf("\n\n");
                      if (idx < 0) break;
                      const paragraph = translateBuf.slice(0, idx);
                      translateBuf = translateBuf.slice(idx + 2);
                      await flushParagraph(paragraph, "\n\n");
                    }
                  }
                } else if (event.type === "meta") {
                  // Proxy meta — forward model, pipeline stats, and citations
                  const metaUpdate: Record<string, unknown> = { type: "meta_update" };
                  if (event.model) metaUpdate.model = event.model;
                  if (event.nodesUsed !== undefined) metaUpdate.nodesUsed = event.nodesUsed;
                  if (event.ragChunks !== undefined) metaUpdate.ragChunks = event.ragChunks;
                  if (event.contextLength !== undefined) metaUpdate.contextLength = event.contextLength;
                  if (Array.isArray(event.matchedServices)) {
                    metaUpdate.matchedServices = event.matchedServices;
                    capturedMatchedServices = event.matchedServices;
                  }
                  if (Object.keys(metaUpdate).length > 1) {
                    controller.enqueue(encoder.encode(JSON.stringify(metaUpdate) + "\n"));
                  }
                  if (event.citations?.length > 0) {
                    capturedFirstTurnCitations = event.citations as Turn1Citation[];
                    controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations: event.citations }) + "\n"));
                  }
                } else if (event.type === "citations") {
                  if (Array.isArray(event.citations) && event.citations.length > 0) {
                    capturedFirstTurnCitations = event.citations as Turn1Citation[];
                  }
                  controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations: event.citations }) + "\n"));
                } else if (event.type === "citations_audit") {
                  capturedCitationsAudit = event as Record<string, unknown>;
                  controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
                } else if (event.type === "coverage_additions") {
                  // PB Task 4 (E3) — capture the coverage_enforcer additions
                  // for the optional recovery re-fire. Forward transparently
                  // so the UI/audit can still see them either way.
                  if (Array.isArray(event.additions)) {
                    coverageAdditions = event.additions
                      .filter(
                        (a: { section?: unknown; document_id?: unknown }) =>
                          typeof a?.section === "string" && typeof a?.document_id === "string",
                      )
                      .map((a: { section: string; document_id: string }) => ({
                        section: a.section,
                        document_id: a.document_id,
                      }));
                  }
                  controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
                } else if (event.type === "clarify_wipe_text") {
                  // Chat-proxy detected an embedded `{"kind":"clarify"`
                  // marker mid-stream (model emitted prose BEFORE the
                  // clarify JSON). Drop everything we've accumulated
                  // so the persist block below writes content:"" and
                  // the assistant row reloads as a clean clarify card.
                  englishContent = "";
                  renderedContent = "";
                  translateBuf = "";
                  controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
                } else if (event.type === "clarify_options") {
                  // Turn-1 model chose to ask for disambiguation. Defensively
                  // sanitize every field before anything else — the upstream
                  // model occasionally ignores the title-format rule and
                  // dumps markdown-wrapped section headings ("**ধারা ১২৩...**")
                  // or partial legal text into title/blurb, which visually
                  // explodes the card grid.
                  //
                  // Rules:
                  //  • strip markdown emphasis (`**`, `__`, backticks, leading `#`)
                  //  • strip leading section-number prefixes on titles so they
                  //    read as concrete topic phrases, not citations
                  //    ("ধারা ১২৩. মজুরি পরিশোধ" → "মজুরি পরিশোধ")
                  //  • collapse whitespace, trim trailing ellipsis
                  //  • hard-cap length (ellipsis added when truncated)
                  const stripMarkdown = (s: string): string =>
                    s
                      .replace(/[*_`~]+/g, "")
                      .replace(/^#{1,6}\s+/gm, "")
                      .replace(/\s+/g, " ")
                      .replace(/[…]+\s*$/g, "")
                      .replace(/\.{3,}\s*$/g, "")
                      .trim();
                  const stripLeadingSection = (s: string): string =>
                    s
                      .replace(/^(?:ধারা|উপ-?ধারা|অনুচ্ছেদ)\s*[০-৯0-9]+[.\):\-—]?\s*/u, "")
                      .replace(/^section\s*[0-9]+[.\):\-—]?\s*/i, "")
                      .replace(/^chapter\s*[ivxlcdm0-9]+[.\):\-—]?\s*/i, "")
                      .trim();
                  const sanitize = (
                    raw: unknown,
                    maxChars: number,
                    opts: { isTitle?: boolean } = {},
                  ): string => {
                    if (typeof raw !== "string") return "";
                    let s = stripMarkdown(raw);
                    if (opts.isTitle) s = stripLeadingSection(s);
                    if (!s) return "";
                    if (s.length <= maxChars) return s;
                    return s.slice(0, maxChars - 1).trimEnd() + "…";
                  };
                  const optionsRaw = Array.isArray(event.options) ? event.options : [];
                  const cappedOptions = optionsRaw.map((o: Record<string, unknown>) => ({
                    ...o,
                    title: sanitize(o.title, 60, { isTitle: true }),
                    blurb: sanitize(o.blurb, 160),
                    scenario_query: sanitize(o.scenario_query, 400),
                  }));
                  const cappedReason = sanitize(event.reason, 200);

                  // Translate card fields when the chat language isn't
                  // English so BN / HI / etc. users don't see English cards
                  // for their English-typed query. `role` stays English by
                  // design (see system-prompt rule 7).
                  if (shouldTranslate) {
                    try {
                      const translatedOptions = await Promise.all(
                        cappedOptions.map(async (o: (typeof cappedOptions)[number]) => {
                          const [title, blurb, scenario_query] = await Promise.all([
                            translateChunk(o.title, { language: chatLanguage }),
                            translateChunk(o.blurb, { language: chatLanguage }),
                            translateChunk(o.scenario_query, { language: chatLanguage }),
                          ]);
                          return { ...o, title, blurb, scenario_query };
                        }),
                      );
                      const reason = cappedReason.trim().length > 0
                        ? await translateChunk(cappedReason, { language: chatLanguage })
                        : cappedReason;
                      capturedClarifyOptions = translatedOptions as unknown as NonNullable<typeof capturedClarifyOptions>;
                      capturedClarifyReason = reason;
                      capturedClarifyOptionsEn = cappedOptions as unknown as NonNullable<typeof capturedClarifyOptionsEn>;
                      capturedClarifyReasonEn = cappedReason;
                      controller.enqueue(encoder.encode(JSON.stringify({
                        ...event,
                        options: translatedOptions,
                        reason,
                      }) + "\n"));
                    } catch (translateErr) {
                      console.warn("[chat] clarify_options translate failed — falling back to capped English", translateErr);
                      capturedClarifyOptions = cappedOptions as unknown as NonNullable<typeof capturedClarifyOptions>;
                      capturedClarifyReason = cappedReason;
                      controller.enqueue(encoder.encode(JSON.stringify({
                        ...event,
                        options: cappedOptions,
                        reason: cappedReason,
                      }) + "\n"));
                    }
                  } else {
                    capturedClarifyOptions = cappedOptions as unknown as NonNullable<typeof capturedClarifyOptions>;
                    capturedClarifyReason = cappedReason;
                    controller.enqueue(encoder.encode(JSON.stringify({
                      ...event,
                      options: cappedOptions,
                      reason: cappedReason,
                    }) + "\n"));
                  }
                }
              } catch {}
            }
          }

          // Flush trailing buffered paragraph (translate path only)
          if (shouldTranslate && translateBuf.trim()) {
            await flushParagraph(translateBuf, "");
            translateBuf = "";
          }

          // Post-stream citations — extract from English source-of-truth so
          // pattern matching against section numbers stays reliable.
          if (englishContent) {
            const citations = extractCitations(englishContent);
            if (citations.length > 0) controller.enqueue(encoder.encode(JSON.stringify({ type: "meta_update", citations }) + "\n"));
          }

          // English source-of-truth for the collapsible. Only emit when the
          // rendered text actually differs (i.e., translation happened).
          if (shouldTranslate && englishContent && renderedContent !== englishContent) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: "source_en",
              content: englishContent,
            }) + "\n"));
          }

          // Title — derived from user query; translate when needed so the
          // sidebar reads in the same language as the conversation.
          const baseTitle = message.length > 60 ? message.slice(0, 57) + "..." : message;
          let title = baseTitle;
          if (shouldTranslate) {
            try {
              title = await translateChunk(baseTitle, { language: chatLanguage });
            } catch {
              title = baseTitle;
            }
          }
          controller.enqueue(encoder.encode(JSON.stringify({ type: "title_update", conversation_id: convId, title }) + "\n"));

          // ── 7.5 — PB Task 3 (D1) turn-1 batch verify ──────────────
          // Stream-first: the answer text + citations have already been
          // sent to the user; verify runs in parallel with the user's
          // reading window. Flag-gated; default OFF until the eval gate
          // confirms accuracy lift on Vercel preview.
          //
          // Trigger: ENABLE_TURN1_VERIFY=1 + ≥2 citations + intent not
          // in {NOT_A_QUESTION, OUT_OF_SCOPE}. The Deep Search G1 emit
          // is wired separately in callOrchestratorDeepSearch — do NOT touch
          // it from here.
          //
          // Deep Search vs D1 mutex: Deep Search runs in a separate
          // branch and does not reach this point — see callOrchestratorDeepSearch
          // early-return at line ~1965 (turn-2+ deepSearchRequested path).
          // D1 only fires on the turn-1 chat-proxy stream below. With
          // Vercel maxDuration=300s and Deep Search worst-case ~280s +
          // D1 ~15-30s, a future change that lets both fire on the same
          // request could brush the cap. The branch separation is the
          // load-bearing guarantee; the explicit !deepSearchRequested
          // conjunction below is defense-in-depth so a future refactor
          // that flattens the branches still trips a type check before
          // shipping.
          let firstTurnVerdicts: Turn1Verdict[] | null = null;
          if (
            process.env.ENABLE_TURN1_VERIFY === "1" &&
            !deepSearchRequested &&
            shouldTriggerTurn1Verify({
              citations: capturedFirstTurnCitations,
              intent: { category: classification.primary_intent },
            })
          ) {
            const verifyStartedAt = Date.now();
            controller.enqueue(encoder.encode(JSON.stringify({ type: "verify_in_progress" }) + "\n"));

            const turn1ConversationContext = (resolvedHistory ?? [])
              .slice(-6)
              .map((m: { role?: string; content?: string }) => {
                const role = m.role === "user" ? "User" : "Assistant";
                const content =
                  typeof m.content === "string" ? m.content.slice(0, 400) : "";
                return `${role}: ${content}`;
              });

            try {
              firstTurnVerdicts = await runTurn1VerifyBatch({
                citations: capturedFirstTurnCitations,
                conversationContext: turn1ConversationContext,
                buildClaim: (c, expected) =>
                  `${englishContent.slice(0, 400)} — specifically claim about ${expected || c.section || ""}${c.document ? ` (${c.document})` : ""}`,
                agentCaller: callOrchestratorContinuationAgent,
                verifyAgent: VERIFY_AGENT,
                // Same per-call budget as Deep Search verify (200s
                // ceiling); first-turn fan-out is usually much smaller
                // (≤6 citations) so total wall time stays under ~30s.
                timeoutMs: 200_000,
              });

              // Stream verify_progress per group as each group's
              // verdicts return — UI shows incremental progress.
              const groupBuckets = new Map<string, Turn1Verdict[]>();
              for (const v of firstTurnVerdicts) {
                const key = `${v.document_id || "UNKNOWN"}::${v.section}`;
                const arr = groupBuckets.get(key);
                if (arr) arr.push(v);
                else groupBuckets.set(key, [v]);
              }
              // Avoid for-of over Map (tsconfig target=es5 without
              // downlevelIteration); forEach is es5-safe.
              groupBuckets.forEach((verdicts, groupKey) => {
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: "verify_progress",
                  group_key: groupKey,
                  verdicts,
                }) + "\n"));
              });
            } catch (err) {
              // Surface the upstream failure in Vercel logs — without
              // this, a broken orchestrator verify agent looks identical to
              // "everything unverifiable" and we lose the signal.
              console.error("[chat/turn1-verify] failed", err);
              const msg = err instanceof Error ? err.message : String(err);
              firstTurnVerdicts = capturedFirstTurnCitations.map((c): Turn1Verdict => ({
                document_id: c.document_id ?? "",
                section: c.section ?? "",
                verdict: "not_verifiable",
                section_corrected: null,
                result_summary: `Verify threw: ${msg.slice(0, 80)}`,
              }));
            }

            const audit: Turn1AuditPayload = {
              checked_count: capturedFirstTurnCitations.length,
              draft_citation_count: capturedFirstTurnCitations.length,
              verdicts: firstTurnVerdicts,
              duration_ms: Date.now() - verifyStartedAt,
              model: process.env.VERIFY_MODEL ?? "opus",
            };
            controller.enqueue(encoder.encode(JSON.stringify({
              type: "turn1_audit",
              payload: audit,
            }) + "\n"));
          }

          // ── 7.6 — PB Task 4 (E3) chat-proxy re-fire ───────────────
          // Single recovery pass on dirty D1 verdicts (max_iter=1, no
          // iteration loop). Latency budget ~60s on flagged turns.
          // Mutex with Deep Search via the same !deepSearchRequested
          // guard introduced for D1 (the load-bearing branch separation
          // is callOrchestratorDeepSearch's early-return at ~1965).
          //
          // Output is collected via a non-streaming consumer; F1
          // corrector (Task 6) consumes recoveredCitations + recoveredText.
          // For Task 4, we only need to emit a recovery_result event so
          // the UI can surface that recovery happened.
          //
          // Flag-gated ENABLE_RECOVERY_LOOP=1 (default OFF).
          let recoveredCitations: Turn1Citation[] | null = null;
          let recoveredText: string | null = null;
          let recoveryAugmentedQuery: string | null = null;
          if (
            process.env.ENABLE_RECOVERY_LOOP === "1" &&
            !deepSearchRequested &&
            firstTurnVerdicts &&
            (hasDirtyVerdicts(firstTurnVerdicts as never[]) || coverageAdditions.length > 0)
          ) {
            try {
              recoveryAugmentedQuery = buildAugmentedQuery({
                original: message,
                verdicts: firstTurnVerdicts as never[],
                coverageAdditions,
              });

              controller.enqueue(encoder.encode(JSON.stringify({
                type: "recovery_in_progress",
              }) + "\n"));

              const reFireRes = await fetch(`${CHAT_PROXY_URL}/chat`, {
                method: "POST",
                headers: proxyHeaders,
                body: JSON.stringify({
                  query: recoveryAugmentedQuery,
                  history: (resolvedHistory || []).slice(-8),
                  max_tokens: 4096,
                  skip_audit: false,
                  system_prompt: systemPrompt,
                  domain: classification.domain,
                  tier: "max",
                  iteration: 2, // signals chat-proxy this is a recovery turn
                }),
                signal: AbortSignal.timeout(60_000),
              });

              if (reFireRes.ok && reFireRes.body) {
                const collected = await collectStreamPayload(reFireRes.body);
                if (collected.citations.length > 0) {
                  recoveredCitations = collected.citations as Turn1Citation[];
                  recoveredText = collected.text;
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: "recovery_result",
                    original_citations_count: capturedFirstTurnCitations.length,
                    recovered_citations_count: collected.citations.length,
                    augmented_query: recoveryAugmentedQuery,
                  }) + "\n"));
                } else {
                  // Re-fire returned no usable citations — log and skip.
                  // Recovery is best-effort; downstream G1 still emits
                  // the honesty band on the original verdicts below.
                  console.error("[chat/recovery] re-fire returned no citations", {
                    augmented_query: recoveryAugmentedQuery,
                  });
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: "recovery_skipped",
                    reason: "no_citations",
                  }) + "\n"));
                }
              } else {
                console.error("[chat/recovery] re-fire HTTP error", {
                  status: reFireRes.status,
                  augmented_query: recoveryAugmentedQuery,
                });
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: "recovery_skipped",
                  reason: "http_error",
                  status: reFireRes.status,
                }) + "\n"));
              }
            } catch (err) {
              console.error("[chat/recovery] failed", err);
              // Recovery is best-effort. Stream lifecycle continues; user
              // still sees original answer + D1 verdicts via G1 below.
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "recovery_skipped",
                reason: "exception",
              }) + "\n"));
            }
          }
          // ── 7.7 — PB Task 6 (F1) llp-chat-recover synthesis corrector ─
          // Last-line defense for "right chunks wrong synthesis". Fires
          // only when D1 verdicts are still dirty after E3 re-fire (E3
          // may have improved retrieval but not synthesis). On F1 success
          // we sanity-verify F1's citations ONCE (separate budget from
          // E3 max_iter), then override the streaming answer + citations
          // and the firstTurnVerdicts so the G1 honesty banner reflects
          // the post-F1 state.
          //
          // Mutex with Deep Search via the same !deepSearchRequested
          // guard used by D1 + E3 — branch separation in
          // callOrchestratorDeepSearch (~line 1965) is the load-bearing
          // guarantee; the guard is defense-in-depth.
          //
          // Latency: F1 30-60s typical + sanity verify ~15-30s. With the
          // chat-proxy stream itself (3-5s TTFT + 30-40s body on long
          // answers), combined D1 + E3 + F1 worst-case ≈ 210-220s on
          // flagged turns. Vercel maxDuration is 300s — headroom ~80s.
          // Tighten F1 timeout in run-recover.ts if real-world P95 lands
          // inside the headroom envelope.
          //
          // Flag-gated ENABLE_F1_CORRECTOR=1 (default OFF).
          let correctorOutput: RecoverOutput | null = null;
          if (
            process.env.ENABLE_F1_CORRECTOR === "1" &&
            !deepSearchRequested &&
            firstTurnVerdicts &&
            hasDirtyVerdicts(firstTurnVerdicts as never[])
          ) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: "corrector_in_progress",
            }) + "\n"));

            try {
              const draftCitationsForCorrector = (
                recoveredCitations ?? capturedFirstTurnCitations
              )
                .filter(
                  (c: { section?: unknown; document_id?: unknown }) =>
                    typeof c?.section === "string" &&
                    c.section &&
                    typeof c?.document_id === "string" &&
                    c.document_id,
                )
                .map((c: { section?: unknown; document_id?: unknown; text?: unknown }) => ({
                  section: c.section as string,
                  document_id: c.document_id as string,
                  text: typeof c.text === "string" ? c.text : "",
                }));
              correctorOutput = await runRecover({
                original_query: message,
                // E3 output preferred; if E3 didn't run we leave empty
                // string — agent leans on draft_citations + verdicts.
                draft_answer: recoveredText ?? "",
                draft_citations: draftCitationsForCorrector,
                verdicts: firstTurnVerdicts.map((v) => ({
                  section: v.section,
                  document_id: v.document_id,
                  verdict: v.verdict,
                  section_corrected: v.section_corrected ?? undefined,
                  notes: v.result_summary,
                })),
                // recovered_chunks left empty — chunks already
                // represented in draft_citations.
              });
            } catch (err) {
              console.error("[chat/corrector] failed", err);
            }

            if (correctorOutput) {
              // Sanity-verify F1's citations ONCE (separate from E3
              // max_iter). Reuse the same per-call budget as D1 verify.
              let sanityVerdicts: Turn1Verdict[] = [];
              try {
                const turn1ConversationContext = (resolvedHistory ?? [])
                  .slice(-6)
                  .map((m: { role?: string; content?: string }) => {
                    const role = m.role === "user" ? "User" : "Assistant";
                    const content =
                      typeof m.content === "string" ? m.content.slice(0, 400) : "";
                    return `${role}: ${content}`;
                  });
                sanityVerdicts = await runTurn1VerifyBatch({
                  citations: correctorOutput.citations.map((c) => ({
                    section: c.section,
                    document_id: c.document_id,
                    text: c.text,
                  })),
                  conversationContext: turn1ConversationContext,
                  buildClaim: (c, expected) =>
                    `${(correctorOutput?.answer ?? "").slice(0, 400)} — specifically claim about ${expected || c.section || ""}${c.document_id ? ` (${c.document_id})` : ""}`,
                  agentCaller: callOrchestratorContinuationAgent,
                  verifyAgent: VERIFY_AGENT,
                  timeoutMs: 200_000,
                });
              } catch (err) {
                console.error("[chat/corrector] sanity verify failed", err);
              }

              controller.enqueue(encoder.encode(JSON.stringify({
                type: "corrector_result",
                answer: correctorOutput.answer,
                citations: correctorOutput.citations,
                confidence: correctorOutput.confidence,
                rewrite_notes: correctorOutput.rewrite_notes,
                sanity_verdicts: sanityVerdicts,
              }) + "\n"));

              // Override D1 verdicts with sanity-verify so G1 banner
              // reflects post-F1 state. Fall-through silent if sanity
              // verify failed: G1 still emits using the original
              // verdicts (best-effort).
              if (sanityVerdicts.length > 0) {
                firstTurnVerdicts = sanityVerdicts;
              }
            } else {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "corrector_skipped",
              }) + "\n"));
            }
          }

          // G1 honesty guard on the first-turn path. Reuse the same
          // adapter pattern as callOrchestratorDeepSearch (agree → verifies)
          // so computeConfidenceBand stays orchestrator-naming-free. Emit
          // suppressed when no D1 verdicts (flag-OFF or gate-OFF).
          if (
            process.env.ENABLE_HONESTY_GUARD === "1" &&
            firstTurnVerdicts &&
            firstTurnVerdicts.length > 0
          ) {
            const adapted: Verdict[] = firstTurnVerdicts.map((v) => ({
              verdict: v.verdict === "agree" ? "verifies" : v.verdict,
              section: v.section_corrected ?? v.section,
              document_id: v.document_id,
            }));
            const band = computeConfidenceBand(adapted);
            if (band) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "confidence_band",
                payload: band,
              }) + "\n"));
            }
          }

        } catch (err) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: "error", message: "Stream interrupted" }) + "\n"));
        }

        // ── 8. Persist conversation ──
        // For non-English: store rendered text in `content`, English in
        // `content_en` for audit + future re-translation.
        const isTranslated = shouldTranslate && renderedContent !== englishContent;
        // When capturedClarifyOptions is populated, the assistant
        // message body is the clarify cards — the bubble stays hidden
        // (see chat-message.tsx `hasClarifyCards`). Persist content:""
        // so any pre-marker prose that leaked before `clarify_wipe_text`
        // doesn't re-surface on reload.
        const finalRendered = capturedClarifyOptions
          ? ""
          : (renderedContent || englishContent);
        let aiMessageId: string | null = null;
        try {
          const sb = createServerClient();
          const baseTitle = message.length > 60 ? message.slice(0, 57) + "..." : message;
          let title = baseTitle;
          if (isTranslated) {
            try { title = await translateChunk(baseTitle, { language: chatLanguage }); } catch {}
          }
          const { error: upsertErr } = await sb.from("conversations").upsert({ id: convId, user_id: userId, title, language: chatLanguage, updated_at: new Date().toISOString() }, { onConflict: "id" });
          if (upsertErr) {
            console.error("[chat] conversations.upsert failed", { convId, userId, upsertErr });
          }
          const { data: inserted, error: insertErr } = await sb.from("messages").insert([
            {
              conversation_id: convId,
              role: "user",
              content: message,
              language: chatLanguage,
            },
            {
              conversation_id: convId,
              role: "assistant",
              content: finalRendered,
              content_en: isTranslated ? englishContent : null,
              language: chatLanguage,
              citations: extractCitations(englishContent),
              clarify_options: capturedClarifyOptions,
              clarify_reason: capturedClarifyReason,
              clarify_options_en: capturedClarifyOptionsEn,
              clarify_reason_en: capturedClarifyReasonEn,
              citations_audit: capturedCitationsAudit,
              matched_services: capturedMatchedServices,
            },
          ]).select("id, role");
          if (insertErr) {
            console.error("[chat] messages.insert failed — conversation will show empty on reload", {
              convId,
              userId,
              finalRenderedLen: finalRendered.length,
              englishLen: englishContent.length,
              insertErr,
            });
          }
          aiMessageId = inserted?.find((m) => m.role === "assistant")?.id ?? null;
          const userMessageId = inserted?.find((m) => m.role === "user")?.id ?? null;

          // Tell the client what DB ids the temp-ids mapped to so the
          // store can swap them in messages[], messageVerifyReports and
          // messageSummaries — otherwise any overlay-carrying click
          // (Verify / Summarize / Download PDF) before a page refresh
          // gets filtered out by the UUID gate at share time.
          if (aiMessageId) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: "assistant_persisted",
              assistant_id: aiMessageId,
              user_id: userMessageId,
            }) + "\n"));
          }

          // Warm the per-message translation cache so the manual translate
          // button doesn't re-translate to a language we already rendered.
          if (isTranslated && aiMessageId) {
            try {
              await sb.from("message_translations").upsert(
                {
                  message_id: aiMessageId,
                  language: chatLanguage,
                  translated_content: finalRendered,
                },
                { onConflict: "message_id,language" },
              );
            } catch { /* cache warming is non-critical */ }
          }
        } catch (persistErr) {
          console.error("[chat] persist block threw", { convId, userId, persistErr });
        }

        // ── 9. Save to cache as pending (English source — translations derived) ──
        if (englishContent && englishContent.length > 100) {
          try {
            const sb2 = createServerClient();
            if (!aiMessageId) {
              const { data: lastMsg } = await sb2
                .from("messages")
                .select("id")
                .eq("conversation_id", convId)
                .eq("role", "assistant")
                .order("created_at", { ascending: false })
                .limit(1);
              aiMessageId = lastMsg?.[0]?.id || null;
            }
            await savePendingCache(hash, message, englishContent, extractCitations(englishContent), aiMessageId ?? undefined, convId);
          } catch {}
        }

        // ── 10. Admin citation verification — disabled, will resume later ──

        // ── 11. Usage tracking — billed against English source for parity ──
        try {
          const { ConvexHttpClient } = await import("convex/browser");
          const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
          const { api: convexApi } = await import("../../../../convex/_generated/api");
          // Turn-1 streaming Grok path — LLP-paid stream 1.
          // chars/4 floored placeholder (P4 will wire real usage).
          const inputTokens = Math.max(1, Math.floor(message.length / 4));
          const outputTokens = Math.max(1, Math.floor(englishContent.length / 4));
          await convexClient.mutation(convexApi.tokenUsage.track, {
            userId,
            tier,
            inputTokens,
            outputTokens,
            model: "grok-4-1-fast-reasoning",
            agentSlug: "chat-proxy-grok",
            turn: 1,
            stream: 1,
          });
        } catch {}

        controller.close();
      },
    });

    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Transfer-Encoding": "chunked", "Cache-Control": "no-cache" } });
  } catch (err) {
    console.error("[chat] top-level error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}