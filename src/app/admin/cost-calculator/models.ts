// src/app/admin/cost-calculator/models.ts
import type { ModelPricing, VerifyModel } from "./calc-types";

interface QualityBand {
  max: number;
  label: string;
  t1Primary: string;
  verifyModel: VerifyModel | null;
  flags: readonly string[];
  pDirty: number;
}

export const USD_TO_BDT = 129;

/**
 * Models registry — every entry tagged with verifiedFromCode boolean.
 * Verification basis (2026-04-28):
 *  - intent classifier model: src/lib/ai/intent-classifier.ts:7
 *  - embedding model: src/lib/ai/gemini-provider.ts:18, token-tracker.ts:15
 *  - chat-proxy MODEL_CONFIG: shared/knowledge/llp/architecture/chat-proxy.md
 *  - Anthropic verify model gate: src/app/api/chat/route.ts:2475
 *  - Orchestrator T2+ continuation: src/app/api/chat/route.ts:580
 */
export const MODELS: Record<string, ModelPricing> = {
  // T1 generators
  "grok-4-1-fast-reasoning": {
    name: "Grok 4.1 Fast (Reasoning)",
    provider: "xAI",
    inputPer1M: 0.20,
    outputPer1M: 0.50,
    note: "Live primary T1 (chat-proxy/server.js TURN1_CHAIN[0]). 2M ctx, single price tier per OpenRouter.",
    verifiedFromCode: true,
  },
  "gemini-3-flash-preview": {
    name: "Gemini 3 Flash Preview",
    provider: "Google",
    inputPer1M: 0,
    outputPer1M: 0,
    badge: "free",
    note: "FREE during preview",
    verifiedFromCode: true,
  },
  "gemini-2.5-flash": {
    name: "Gemini 2.5 Flash",
    provider: "Google",
    inputPer1M: 0.30,
    outputPer1M: 2.50,
    note: "Used for intent classify + A2 BN bridge",
    verifiedFromCode: true,
  },
  "gemini-embedding-001": {
    name: "Gemini Embedding 001",
    provider: "Google",
    inputPer1M: 0.006,
    outputPer1M: 0,
    note: "768-dim embeddings",
    verifiedFromCode: true,
  },
  "claude-haiku-4.5": {
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    inputPer1M: 1.00,
    outputPer1M: 5.00,
    note: "Tree node confirm in chat-proxy + D1 verify option",
    verifiedFromCode: true,
  },
  "claude-sonnet-4.6": {
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    inputPer1M: 3.00,
    outputPer1M: 15.00,
    note: "F1 corrector + D1 verify option",
    verifiedFromCode: true,
  },
  "claude-opus-4.7": {
    name: "Claude Opus 4.7",
    provider: "Anthropic",
    inputPer1M: 5.00,
    outputPer1M: 25.00,
    note: "Default D1 verify model (VERIFY_MODEL=opus)",
    verifiedFromCode: true,
  },
  "gpt-5.4": {
    name: "GPT-5.4",
    provider: "OpenAI",
    inputPer1M: 2.50,
    outputPer1M: 15.00,
    note: "Placeholder pricing — only matters when redClaw subsidy < 100%",
    verifiedFromCode: true,
  },
  "glm-5-turbo": {
    name: "GLM-5 Turbo",
    provider: "Z.AI",
    inputPer1M: 0,
    outputPer1M: 0,
    badge: "free",
    note: "Z.AI subscription — fallback for free/mini tier in chat-proxy MODEL_CONFIG (not currently honored due to tier:max hardcode in route.ts:2067)",
    verifiedFromCode: true,
  },
};

/**
 * Turn 1 fixed token counts (production-measured).
 * Source: existing calc constants + chat-proxy logs.
 */
export const T1_FIXED = {
  // Calibrated 2026-04-28 against live Grok 4.1 Fast Reasoning via
  // scripts/grok-token-meter.ts (5-query sample, real xAI usage block).
  // Real avg per call: prompt 8,142 / completion 378 / cost $0.00179.
  // Static system prompt fixed at ~5,256 tokens (chars/4 of DEFAULT_SYSTEM_PROMPT
  // in chat-proxy/server.js). Reset slider defaults below in page.tsx INITIAL_STATE.
  systemPromptTokens: 5256,
  historyTokens: 500,
  queryTokens: 50,
  intentInputTokens: 200,
  intentOutputTokens: 50,
  embeddingTokens: 50,
  // Subsection self-check (live chat-proxy: chat-proxy/server.js subsectionSelfCheck).
  // Fires only when citations contain `§X(n)` patterns that need cross-checking
  // against retrieved chunks. Multiple mismatches are batched into ONE Grok call
  // per chat (not per-node). Tokens per call: ~150 in / 150 out.
  // Probability is the fraction of chats expected to trigger the check.
  selfcheckInputTokens: 150,
  selfcheckOutputTokens: 40,
  selfcheckProb: 0.25,
  // A2 BN bridge: ~150 in + 150 out per BN query
  a2BnInputTokens: 150,
  a2BnOutputTokens: 150,
  // D1 verify (runTurn1VerifyBatch — fan-out across ~1.5 groups per chat by default).
  verifyInputTokens: 3000,
  verifyOutputTokens: 100,
  verifyGroupsPerChat: 1.5,
  // F1 corrector
  f1InputTokens: 5000,
  f1OutputTokens: 1000,
};

/** Turn 2+ fixed token counts. */
export const T2_FIXED = {
  citationTokens: 200,
  queryTokens: 50,
};

/** Quality slider band breakpoints for cascade. */
export const QUALITY_BANDS: readonly QualityBand[] = [
  { max: 24, label: "Cost floor",            t1Primary: "gemini-3-flash-preview",       verifyModel: null,         flags: [],                                                                                                                                   pDirty: 18 },
  { max: 49, label: "Balanced",              t1Primary: "gemini-3-flash-preview",       verifyModel: null,         flags: ["ENABLE_HONESTY_GUARD"],                                                                                                             pDirty: 14 },
  { max: 74, label: "Production today",      t1Primary: "grok-4-1-fast-reasoning", verifyModel: null,         flags: ["ENABLE_HONESTY_GUARD"],                                                                                                             pDirty: 12 },
  { max: 89, label: "Phase B partial",       t1Primary: "grok-4-1-fast-reasoning", verifyModel: "sonnet-4.6", flags: ["ENABLE_HONESTY_GUARD", "ENABLE_BN_BRIDGE", "ENABLE_TURN1_VERIFY", "ENABLE_VERIFY_CACHE"],                                           pDirty: 10 },
  { max: 100, label: "Phase B Full",         t1Primary: "grok-4-1-fast-reasoning", verifyModel: "opus",       flags: ["ENABLE_HONESTY_GUARD", "ENABLE_BN_BRIDGE", "ENABLE_TURN1_VERIFY", "ENABLE_RECOVERY_LOOP", "ENABLE_F1_CORRECTOR", "ENABLE_VERIFY_CACHE"], pDirty: 8 },
];

/** Map verifyModel choice → MODELS key. */
export const VERIFY_MODEL_MAP = {
  "opus": "claude-opus-4.7",
  "sonnet-4.6": "claude-sonnet-4.6",
  "haiku-4.5": "claude-haiku-4.5",
  "grok-reasoning": "grok-4-1-fast-reasoning",
} as const satisfies Record<VerifyModel, keyof typeof MODELS>;
