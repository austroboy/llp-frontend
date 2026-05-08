// src/app/admin/cost-calculator/calc-engine.ts
import type { Macros, VerifyModel, Stream1Costs, Stream2Costs, ModelPricing } from "./calc-types";
import { QUALITY_BANDS, MODELS, T1_FIXED, T2_FIXED, VERIFY_MODEL_MAP } from "./models";

/** Standard per-call cost = input tokens × input price + output tokens × output price. */
function costPerCall(model: ModelPricing, inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1e6) * model.inputPer1M + (outputTokens / 1e6) * model.outputPer1M;
}

export interface CascadeResult {
  t1Primary: string;
  verifyModel: VerifyModel | null;
  flagsOn: Set<string>;
  pDirty: number;
}

interface OverrideValues {
  t1Primary?: string;
  verifyModel?: VerifyModel | null;
  flagsOn?: Set<string>;
  pDirty?: number;
}

export function applyMacros(
  macros: Macros,
  overrides: Set<string>,
  overrideValues: OverrideValues = {},
): CascadeResult {
  const band = QUALITY_BANDS.find(b => macros.quality <= b.max) ?? QUALITY_BANDS[QUALITY_BANDS.length - 1];

  const cascadedT1Primary = band.t1Primary;
  const cascadedVerifyModel: VerifyModel | null = band.verifyModel;
  const cascadedFlagsOn = new Set(band.flags);

  return {
    t1Primary: overrides.has("t1Primary") && overrideValues.t1Primary !== undefined
      ? overrideValues.t1Primary
      : cascadedT1Primary,
    verifyModel: overrides.has("verifyModel") && overrideValues.verifyModel !== undefined
      ? overrideValues.verifyModel
      : cascadedVerifyModel,
    flagsOn: overrides.has("flagsOn") && overrideValues.flagsOn !== undefined
      ? overrideValues.flagsOn
      : cascadedFlagsOn,
    pDirty: overrides.has("pDirty") && overrideValues.pDirty !== undefined
      ? overrideValues.pDirty
      : band.pDirty,
  };
}

export interface Stream1Inputs {
  cascade: CascadeResult;
  t1RagChunks: number;
  t1TreeNodes: number;
  t1Output: number;
  t1UptimePct: number;     // 0–100
  bnPct: number;           // 0–100
  a2Enabled: boolean;
  selfcheckEnabled: boolean;
}

export function computeStream1(inputs: Stream1Inputs): Stream1Costs {
  const { cascade, t1RagChunks, t1TreeNodes, t1Output, t1UptimePct, bnPct, a2Enabled, selfcheckEnabled } = inputs;

  const t1TotalInput = T1_FIXED.systemPromptTokens + t1RagChunks + t1TreeNodes + T1_FIXED.historyTokens + T1_FIXED.queryTokens;

  // Intent classify (Gemini 2.5 Flash, always fires)
  const gemFlash = MODELS["gemini-2.5-flash"];
  const intentCost = costPerCall(gemFlash, T1_FIXED.intentInputTokens, T1_FIXED.intentOutputTokens);

  // Embedding (always fires)
  const embed = MODELS["gemini-embedding-001"];
  const embedCost = costPerCall(embed, T1_FIXED.embeddingTokens, 0);

  // T1 generator primary + fallback (uptime-weighted)
  const t1Primary = MODELS[cascade.t1Primary] ?? MODELS["grok-4-1-fast-reasoning"];
  const t1Fallback = MODELS["gemini-3-flash-preview"];
  const uf = t1UptimePct / 100;
  const t1GenPrimary = costPerCall(t1Primary, t1TotalInput, t1Output) * uf;
  const t1GenFallback = costPerCall(t1Fallback, t1TotalInput, t1Output) * (1 - uf);

  // Subsection self-check — gated by ENABLE_SUBSECTION_SELFCHECK (default OFF
  // per chat-proxy/server.js:171). When ON: single batched Grok call when
  // §X(n) citations need cross-checking, ~25% probability per chat.
  const subsectionSelfcheck = selfcheckEnabled
    ? T1_FIXED.selfcheckProb *
      costPerCall(t1Primary, T1_FIXED.selfcheckInputTokens, T1_FIXED.selfcheckOutputTokens)
    : 0;

  // A2 BN bridge (Gemini Flash translation, fires only when flag ON × bn%)
  const a2BnBridge = a2Enabled
    ? (bnPct / 100) * costPerCall(gemFlash, T1_FIXED.a2BnInputTokens, T1_FIXED.a2BnOutputTokens)
    : 0;

  const total = intentCost + embedCost + t1GenPrimary + t1GenFallback + subsectionSelfcheck + a2BnBridge;

  return { intentCost, embedCost, t1GenPrimary, t1GenFallback, subsectionSelfcheck, a2BnBridge, total };
}

export interface Stream2Inputs {
  cascade: CascadeResult;
  t1BaseCost: number;       // from computeStream1, used by E3 retry math
  t2PriorAnswer: number;
  t2History: number;
  t2Output: number;
  t2UptimePct: number;
  d1Enabled: boolean;
  e3Enabled: boolean;
  f1Enabled: boolean;
  cacheEnabled: boolean;
  cacheHitPct: number;      // 0–100
  deepSearchPct: number;    // 0–100
  pDirty: number;           // 0–100
  pF1: number;              // 0–100
  subsidyPct: number;       // 0–100
}

export function computeStream2(inputs: Stream2Inputs): Stream2Costs {
  const {
    cascade, t1BaseCost,
    t2PriorAnswer, t2History, t2Output, t2UptimePct,
    d1Enabled, e3Enabled, f1Enabled, cacheEnabled,
    cacheHitPct, deepSearchPct, pDirty, pF1, subsidyPct,
  } = inputs;

  const t2TotalInput = t2PriorAnswer + T2_FIXED.citationTokens + t2History + T2_FIXED.queryTokens;

  // T2+ continuation — live: orchestrator `llp-chat-followup` agent runs
  // GPT-5.4 via openai-codex (per docs/data-accuracy-plan/strong-chain-design.md:36
  // and docs/agents/llp-chat-followup-config-2026-04-22.md). Real LLP burn
  // = $0 because this routes through the user's Codex subscription, but
  // pay-as-you-go-equivalent uses OpenAI GPT-5.4 pricing. Sonnet 4.6 is
  // the proposed fallback (still under evaluation), not the live default.
  const gpt = MODELS["gpt-5.4"];
  const sonnet = MODELS["claude-sonnet-4.6"];
  const u2 = t2UptimePct / 100;
  const t2Continuation = costPerCall(gpt, t2TotalInput, t2Output) * u2
                       + costPerCall(sonnet, t2TotalInput, t2Output) * (1 - u2);

  // Resolve verify model up-front so D1, E3, and F1-sanity-verify share it.
  const verifyModelEntry = cascade.verifyModel
    ? MODELS[VERIFY_MODEL_MAP[cascade.verifyModel]]
    : null;
  const verifyPerCallCost = verifyModelEntry
    ? costPerCall(verifyModelEntry, T1_FIXED.verifyInputTokens, T1_FIXED.verifyOutputTokens)
    : 0;
  // D1 verify (runTurn1VerifyBatch fans out across ~1.5 groups per chat).
  let d1Verify = 0;
  if (d1Enabled && verifyModelEntry) {
    const baseCost = verifyPerCallCost * T1_FIXED.verifyGroupsPerChat;
    const cacheMultiplier = cacheEnabled ? (1 - cacheHitPct / 100) : 1;
    const deepGate = 1 - deepSearchPct / 100;
    d1Verify = baseCost * cacheMultiplier * deepGate;
  }

  // E3 recovery
  const e3Recovery = e3Enabled
    ? (1 - deepSearchPct / 100) * (pDirty / 100) * (t1BaseCost + d1Verify)
    : 0;

  // F1 corrector — Sonnet rewrite + immediate sanity-verify pass
  // (route.ts:2659 runs runTurn1VerifyBatch right after F1 succeeds).
  const f1Corrector = f1Enabled
    ? (1 - deepSearchPct / 100) * (pF1 / 100) *
      (costPerCall(sonnet, T1_FIXED.f1InputTokens, T1_FIXED.f1OutputTokens)
       + verifyPerCallCost * T1_FIXED.verifyGroupsPerChat)
    : 0;

  const subtotalBeforeSubsidy = t2Continuation + d1Verify + e3Recovery + f1Corrector;
  const llpResidual = subtotalBeforeSubsidy * (1 - subsidyPct / 100);
  const redClawAbsorbed = subtotalBeforeSubsidy - llpResidual;

  return {
    t2Continuation, d1Verify, e3Recovery, f1Corrector,
    subtotalBeforeSubsidy, llpResidual, redClawAbsorbed,
  };
}

import type { CalcState, BlendedChat, TierPL, MonthlyAggregate, TierKey } from "./calc-types";
import { TIER_KEYS } from "./calc-types";
import { USD_TO_BDT } from "./models";

export function computeBlended(state: CalcState, tier: TierKey): BlendedChat {
  const overrides = new Set(state.overrides);
  const cascade = applyMacros(state.macros, overrides, {
    verifyModel: state.phaseB.verifyModel,
  });

  const stream1 = computeStream1({
    cascade,
    t1RagChunks: state.t1RagChunks,
    t1TreeNodes: state.t1TreeNodes,
    t1Output: state.t1Output,
    t1UptimePct: state.tierCfg[tier].t1Uptime,
    bnPct: state.phaseB.bnPct,
    a2Enabled: state.phaseB.flags.ENABLE_BN_BRIDGE,
    selfcheckEnabled: state.phaseB.flags.ENABLE_SUBSECTION_SELFCHECK,
  });

  const stream2 = computeStream2({
    cascade,
    t1BaseCost: stream1.total,
    t2PriorAnswer: state.t2PriorAnswer,
    t2History: state.t2History,
    t2Output: state.t2Output,
    t2UptimePct: state.tierCfg[tier].t2Uptime,
    d1Enabled: state.phaseB.flags.ENABLE_TURN1_VERIFY,
    e3Enabled: state.phaseB.flags.ENABLE_RECOVERY_LOOP,
    f1Enabled: state.phaseB.flags.ENABLE_F1_CORRECTOR,
    cacheEnabled: state.phaseB.flags.ENABLE_VERIFY_CACHE,
    cacheHitPct: state.phaseB.cacheHitPct,
    deepSearchPct: state.phaseB.deepSearchPct,
    pDirty: state.phaseB.pDirty,
    pF1: state.phaseB.pF1,
    subsidyPct: state.macros.subsidyPct,
  });

  return {
    stream1,
    stream2,
    totalPerChatLLP: stream1.total + stream2.llpResidual,
  };
}

export function computeTierPL(state: CalcState, tier: TierKey): TierPL {
  const blended = computeBlended(state, tier);
  // Effective usage = allowance cap × engagement %. Real users rarely hit
  // their full cap, so utilizationPct discounts the average accordingly.
  const utilization = state.tierCfg[tier].utilizationPct / 100;
  const usage = state.monthlyUsage[tier] * utilization;
  const grossPerUser = (blended.stream1.total + blended.stream2.subtotalBeforeSubsidy) * usage;
  // True LLP burn (refined 2026-04-29):
  //   = Grok 4.1 T1 generator (always real $ to xAI)
  //   + Stream-2 LLP residual (only > 0 when subsidyPct < 100, i.e. modeling
  //     "what if Claude Pro / Codex subs vanish" — slider-driven sensitivity).
  // Excluded from net (treated as $0 marginal):
  //   - intent classify (Gemini 2.5 Flash) + embeddings: ~$0.000185/chat noise
  //   - Stream-2 fully absorbed at subsidy=100 (current live state)
  const grokT1PerChat = blended.stream1.t1GenPrimary + blended.stream1.t1GenFallback;
  const netPerUserLLP = (grokT1PerChat + blended.stream2.llpResidual) * usage;
  // Free tiers never produce revenue regardless of priceBdt — defensive clamp
  // so a stray Tier Config edit can't inflate net margin.
  const isFreeTier = tier === "free_guest" || tier === "free_subscribed";
  const revenuePerUser = isFreeTier ? 0 : state.tierCfg[tier].priceBdt / USD_TO_BDT;
  const marginPerUser = revenuePerUser - netPerUserLLP;
  return { blended, usage, grossPerUser, netPerUserLLP, revenuePerUser, marginPerUser };
}

export function computeMonthly(state: CalcState): MonthlyAggregate {
  // User counts come straight from state.userCounts (directly editable per
  // tier in the Mix Simulation table). Scale + Paid % sliders redistribute
  // the same field via the reducer; this function just consumes the result.
  const userCounts: Record<TierKey, number> = state.userCounts;
  const totalUsers = TIER_KEYS.reduce((s, k) => s + (userCounts[k] || 0), 0);

  const perTier = {} as Record<TierKey, { users: number; pl: TierPL }>;
  let totalGross = 0, totalNetLLP = 0, totalRedClaw = 0, totalRev = 0, totalChats = 0;

  for (const tier of TIER_KEYS) {
    const users = userCounts[tier];
    const pl = computeTierPL(state, tier);
    perTier[tier] = { users, pl };
    totalGross += pl.grossPerUser * users;
    totalNetLLP += pl.netPerUserLLP * users;
    totalRedClaw += pl.blended.stream2.redClawAbsorbed * pl.usage * users;
    totalRev += pl.revenuePerUser * users;
    totalChats += pl.usage * users;
  }

  const totalMargin = totalRev - totalNetLLP;
  const marginPct = totalRev > 0 ? (totalMargin / totalRev) * 100 : 0;

  const totalSubscriptions = state.subscriptions
    .filter(s => s.enabled)
    .reduce((sum, s) => sum + (Number.isFinite(s.monthlyUsd) ? s.monthlyUsd : 0), 0);
  const marginAfterFixed = totalMargin - totalSubscriptions;
  const marginAfterFixedPct = totalRev > 0 ? (marginAfterFixed / totalRev) * 100 : 0;

  return {
    perTier, totalGross, totalNetLLP, totalRedClaw, totalRev,
    totalMargin, marginPct, totalChats, totalUsers,
    totalSubscriptions, marginAfterFixed, marginAfterFixedPct,
  };
}
