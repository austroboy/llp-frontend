// src/app/admin/cost-calculator/calc-types.ts

export type Currency = "USD" | "BDT";
export type TierKey = "free_guest" | "free_subscribed" | "mini" | "max";
export const TIER_KEYS: TierKey[] = ["free_guest", "free_subscribed", "mini", "max"];

export type PresetId =
  | "today"
  | "phase_b_full"
  | "phase_b_full_no_subsidy"
  | "cost_floor"
  | "investor_pitch";

export type VerifyModel = "opus" | "sonnet-4.6" | "haiku-4.5" | "grok-reasoning";

export interface ModelPricing {
  name: string;
  provider: string;
  inputPer1M: number;
  outputPer1M: number;
  note?: string;
  badge?: "free" | "preview" | "backup" | "verified";
  /** True if this model + pricing was code-verified from the live /chat path on 2026-04-28. */
  verifiedFromCode: boolean;
}

export interface TierCfg {
  label: string;
  color: string;
  priceBdt: number;
  /** % of monthlyUsage cap actually consumed on average (0–100). 100 = users hit full allowance. */
  utilizationPct: number;
  t1Uptime: number;
  t2Uptime: number;
}

export interface PhaseBState {
  flags: {
    ENABLE_HONESTY_GUARD: boolean;
    ENABLE_BN_BRIDGE: boolean;
    ENABLE_TURN1_VERIFY: boolean;
    ENABLE_RECOVERY_LOOP: boolean;
    ENABLE_F1_CORRECTOR: boolean;
    ENABLE_VERIFY_CACHE: boolean;
    ENABLE_SUBSECTION_SELFCHECK: boolean;
  };
  verifyModel: VerifyModel;
  bnPct: number;          // 0–100
  deepSearchPct: number;  // 0–50
  cacheHitPct: number;    // 0–80
  pDirty: number;         // 0–40
  pF1: number;            // 0–15
}

export interface Macros {
  scaleUsers: number;     // 50–10000
  quality: number;        // 0–100
  subsidyPct: number;     // 0–100, default 100
}

export interface SubscriptionItem {
  id: string;
  label: string;
  note?: string;
  monthlyUsd: number;
  enabled: boolean;
}

export interface CalcState {
  presetId: PresetId | "custom";
  macros: Macros;
  overrides: string[];    // JSON-serializable; convert to Set in cascade
  phaseB: PhaseBState;
  // Token sliders (move with Quality unless overridden):
  t1RagChunks: number;
  t1TreeNodes: number;
  t1Output: number;
  t2PriorAnswer: number;
  t2History: number;
  t2Output: number;
  // Tier config + usage (move with Scale unless overridden):
  tierCfg: Record<TierKey, TierCfg>;
  monthlyUsage: Record<TierKey, number>;
  /**
   * Per-tier user counts. Directly editable from the Mix Simulation table.
   * Scale slider redistributes by default mix (30/70 free, 60/40 paid). Paid %
   * slider re-balances paid/free buckets. Direct edit overrides cell.
   */
  userCounts: Record<TierKey, number>;
  paidPercent: number;
  // Display:
  currency: Currency;
  // Fixed monthly costs (Advanced tab) — added on top of per-chat math.
  subscriptions: SubscriptionItem[];
}

/** Per-line-item costs for one chat (pre-mix). */
export interface Stream1Costs {
  intentCost: number;
  embedCost: number;
  t1GenPrimary: number;
  t1GenFallback: number;
  /**
   * Subsection self-check cost (live chat-proxy: probabilistic Grok call when
   * §X(n) citations need cross-check, batched into one call per chat).
   */
  subsectionSelfcheck: number;
  a2BnBridge: number;
  total: number;
}

export interface Stream2Costs {
  t2Continuation: number;
  d1Verify: number;
  e3Recovery: number;
  f1Corrector: number;
  /** Sum BEFORE subsidy multiplier. */
  subtotalBeforeSubsidy: number;
  /** Sum AFTER subsidy multiplier (LLP residual share). */
  llpResidual: number;
  /** Amount absorbed by redClaw. */
  redClawAbsorbed: number;
}

export interface BlendedChat {
  stream1: Stream1Costs;
  stream2: Stream2Costs;
  /** Total per chat to LLP (stream1.total + stream2.llpResidual). */
  totalPerChatLLP: number;
}

export interface TierPL {
  blended: BlendedChat;
  usage: number;
  grossPerUser: number;     // stream1 + stream2 subtotal × usage
  netPerUserLLP: number;    // Grok 4.1 T1 generator (primary + fallback) × usage — true LLP burn
  revenuePerUser: number;
  marginPerUser: number;    // revenue − netPerUserLLP
}

export interface MonthlyAggregate {
  perTier: Record<TierKey, { users: number; pl: TierPL }>;
  totalGross: number;       // gross sum across all tiers
  totalNetLLP: number;      // net LLP cost sum (per-chat only)
  totalRedClaw: number;     // amount redClaw absorbed
  totalRev: number;
  totalMargin: number;      // totalRev - totalNetLLP (per-chat margin, pre-fixed)
  marginPct: number;        // totalMargin / totalRev (pre-fixed)
  totalChats: number;
  totalUsers: number;
  // Fixed monthly subscriptions (Advanced tab) and post-fixed bottom line:
  totalSubscriptions: number;     // sum of enabled subscription items
  marginAfterFixed: number;       // totalMargin - totalSubscriptions
  marginAfterFixedPct: number;    // marginAfterFixed / totalRev
}

// ─── Live telemetry payload (consumed by "Today (prod)" preset) ───────────────

/** Per-tier rolling-window summary, all counts are unique-user/request totals. */
export interface LiveTierStats {
  users: number;                // distinct userIds in window
  requests: number;             // sum of requestCount
  requestsPerUserDay: number;   // requests / (users * windowDays), 1 dp
  avgInputT1: number;           // mean inputUsed for turn=1 rows
  avgOutputT1: number;          // mean outputUsed for turn=1 rows
  avgInputT2: number;           // mean inputUsed for turn=2 rows (0 if no T2 traffic)
  avgOutputT2: number;          // mean outputUsed for turn=2 rows
}

/** Per-agent slug aggregate (for stream-mix display). */
export interface LiveAgentStats {
  requests: number;
  totalInput: number;
  totalOutput: number;
  stream: number;               // 1 = T1 / 2 = T2+
  model?: string;
}

/**
 * Response shape from GET /api/admin/cost-calc/live?days=N.
 *
 * Token counts are chars/4 placeholder until P4 wires real `usage_tokens`
 * events from upstream — show with "Estimated" tag in UI.
 */
export interface LiveDataResponse {
  windowDays: number;
  windowStart: string;          // YYYY-MM-DD
  windowEnd: string;            // YYYY-MM-DD
  totalRequests: number;
  totalUsers: number;           // distinct userIds across all tiers
  perTier: Record<TierKey, LiveTierStats>;
  perAgent: Record<string, LiveAgentStats>;
  ratios: {
    bnPct: number;              // % requests where agentSlug = "gemini-bn-bridge"
    deepSearchPct: number;      // % where agentSlug = "chat-proxy-deep"
    cacheHitPct: number;        // 0 — not yet measurable from convex (see cacheHitNote)
    cacheHitNote?: string;      // optional explainer for the 0
    t2Pct: number;              // % rows with turn=2 (continuation share)
  };
  pDirty: number | null;        // verify_failure / verify_total — null if no llp-chat-verify rows
  estNote: string;              // "Token counts are chars/4 placeholder…"
  generatedAt: string;          // ISO
}
