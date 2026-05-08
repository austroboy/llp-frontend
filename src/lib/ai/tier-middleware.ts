// Labor Law Partner — Tier Enforcement Middleware
// Server-side only. Never trust client or prompt-level gating.

import { currentUser } from "@clerk/nextjs/server";
import type {
  Tier,
  TierConfig,
  IntentClassification,
  Intent,
  ClerkTierMetadata,
} from "./framework-types";
import type { ProductMatchResult, LiveService } from "./product-types";
import {
  DEFAULT_TIER_CONFIGS,
  TIERS,
  INTENTS,
  resolveTier,
  CTA_MESSAGES,
  LEGAL_DISCLAIMER,
  getKnowledgeTimestamp,
} from "./framework-types";

// ── Live tier config: 60s in-memory cache backed by Convex ──────
// Admin-edited values in `tierConfig` Convex table become effective
// within ~60s. On Convex outage, serve the last-known snapshot, then
// fall back to DEFAULT_TIER_CONFIGS. Cold-start callers that can't
// await get DEFAULT_TIER_CONFIGS via the sync shims below.

const TIER_CONFIG_TTL_MS = 60_000;
let cachedTierConfigs: { at: number; data: TierConfig[] } | null = null;
let inflightTierConfigs: Promise<TierConfig[]> | null = null;

interface ConvexTierRow {
  tier?: string;
  label?: string;
  allowedIntents?: unknown;
  dailyRequestLimit?: unknown;
  rateLimit?: unknown;
  fileUploadAllowed?: unknown;
  crossDomainAllowed?: unknown;
  advisoryAllowed?: unknown;
  price?: unknown;
}

const VALID_INTENTS = new Set<Intent>(INTENTS as readonly Intent[]);

function coerceTierRow(row: ConvexTierRow, fallback: TierConfig): TierConfig {
  const allowedIntents = Array.isArray(row.allowedIntents)
    ? row.allowedIntents.filter(
        (i): i is Intent => typeof i === "string" && VALID_INTENTS.has(i as Intent),
      )
    : [];

  return {
    tier: fallback.tier,
    label: typeof row.label === "string" && row.label.length > 0 ? row.label : fallback.label,
    allowedIntents: allowedIntents.length > 0 ? allowedIntents : fallback.allowedIntents,
    dailyRequestLimit:
      typeof row.dailyRequestLimit === "number" && row.dailyRequestLimit >= 0
        ? row.dailyRequestLimit
        : fallback.dailyRequestLimit,
    rateLimit:
      typeof row.rateLimit === "number" && row.rateLimit > 0
        ? row.rateLimit
        : fallback.rateLimit,
    fileUploadAllowed:
      typeof row.fileUploadAllowed === "boolean" ? row.fileUploadAllowed : fallback.fileUploadAllowed,
    crossDomainAllowed:
      typeof row.crossDomainAllowed === "boolean" ? row.crossDomainAllowed : fallback.crossDomainAllowed,
    advisoryAllowed:
      typeof row.advisoryAllowed === "boolean" ? row.advisoryAllowed : fallback.advisoryAllowed,
    price: typeof row.price === "number" ? row.price : fallback.price,
  };
}

async function loadAllTierConfigs(): Promise<TierConfig[]> {
  const now = Date.now();
  if (cachedTierConfigs && now - cachedTierConfigs.at < TIER_CONFIG_TTL_MS) {
    return cachedTierConfigs.data;
  }
  if (inflightTierConfigs) return inflightTierConfigs;

  inflightTierConfigs = (async () => {
    try {
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL missing");
      const { ConvexHttpClient } = await import("convex/browser");
      const convexClient = new ConvexHttpClient(url);
      const { api: convexApi } = await import("../../../convex/_generated/api");
      const rows = (await convexClient.query(convexApi.tierConfig.list, {})) as ConvexTierRow[];
      const merged: TierConfig[] = (TIERS as readonly Tier[]).map((t) => {
        const fallback =
          DEFAULT_TIER_CONFIGS.find((c) => c.tier === t) ?? DEFAULT_TIER_CONFIGS[0];
        const row = rows.find((r) => r.tier === t);
        return row ? coerceTierRow(row, fallback) : fallback;
      });
      cachedTierConfigs = { at: Date.now(), data: merged };
      return merged;
    } catch (err) {
      if (!cachedTierConfigs) {
        console.warn("[tier-config] Convex load failed, using DEFAULT_TIER_CONFIGS:", (err as Error).message);
      }
      return cachedTierConfigs?.data ?? DEFAULT_TIER_CONFIGS;
    } finally {
      inflightTierConfigs = null;
    }
  })();

  return inflightTierConfigs;
}

// ── Async tier accessors (use these in route handlers) ─────────

export async function getAllTierConfigsAsync(): Promise<TierConfig[]> {
  return loadAllTierConfigs();
}

export async function getTierConfigAsync(tier: Tier): Promise<TierConfig> {
  const all = await loadAllTierConfigs();
  return (
    all.find((c) => c.tier === tier) ??
    DEFAULT_TIER_CONFIGS.find((c) => c.tier === tier) ??
    DEFAULT_TIER_CONFIGS[0]
  );
}

export async function checkDailyRequestLimitAsync(
  tier: Tier,
  currentCount: number,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const config = await getTierConfigAsync(tier);
  const remaining = config.dailyRequestLimit - currentCount;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: config.dailyRequestLimit,
  };
}

export async function checkIntentAccessAsync(
  tier: Tier,
  classification: IntentClassification,
): Promise<AccessCheckResult> {
  const config = await getTierConfigAsync(tier);
  return checkIntentAccessFromConfig(config, classification, tier);
}

function checkIntentAccessFromConfig(
  config: TierConfig,
  classification: IntentClassification,
  tier: Tier,
): AccessCheckResult {
  const blocked: Intent[] = [];

  for (const intent of classification.intents) {
    if (!config.allowedIntents.includes(intent)) {
      blocked.push(intent);
    }
  }

  if (
    classification.cross_domains.length > 0 &&
    !config.crossDomainAllowed &&
    !blocked.includes("CROSS_DOMAIN")
  ) {
    blocked.push("CROSS_DOMAIN");
  }

  const allowed = blocked.length === 0;

  let cta: AccessCheckResult["cta"] = null;
  if (!allowed && tier !== "max") {
    const ctaMsg = CTA_MESSAGES[tier as Exclude<Tier, "max">];
    if (ctaMsg) cta = ctaMsg;
  }

  return { allowed, blockedIntents: blocked, cta };
}

// ── Resolve user's tier from Clerk ───────────────────────────────

export async function getUserTier(): Promise<{
  tier: Tier;
  userId: string | null;
}> {
  try {
    const user = await currentUser();
    if (!user) return { tier: "free_guest", userId: null };

    const metadata = user.publicMetadata as ClerkTierMetadata | undefined;
    const tier = resolveTier(metadata);
    return { tier, userId: user.id };
  } catch {
    return { tier: "free_guest", userId: null };
  }
}

// ── Get tier config ──────────────────────────────────────────────
// Sync getter: returns the cached snapshot if any prior async call
// has warmed it; otherwise falls back to DEFAULT_TIER_CONFIGS.
// Prefer getTierConfigAsync in new code so the first cold-start
// caller pays the Convex round-trip and warms the cache.

export function getTierConfig(tier: Tier): TierConfig {
  const snapshot = cachedTierConfigs?.data;
  if (snapshot) {
    const live = snapshot.find((c) => c.tier === tier);
    if (live) return live;
  }
  return (
    DEFAULT_TIER_CONFIGS.find((c) => c.tier === tier) ??
    DEFAULT_TIER_CONFIGS[0]
  );
}

// ── Check intent access ─────────────────────────────────────────

export interface AccessCheckResult {
  allowed: boolean;
  blockedIntents: Intent[];
  cta: { text: string; textBn: string; targetTier: Tier | null } | null;
}

export function checkIntentAccess(
  tier: Tier,
  classification: IntentClassification
): AccessCheckResult {
  const config = getTierConfig(tier);
  const blocked: Intent[] = [];

  for (const intent of classification.intents) {
    if (!config.allowedIntents.includes(intent)) {
      blocked.push(intent);
    }
  }

  // Cross-domain check
  if (
    classification.cross_domains.length > 0 &&
    !config.crossDomainAllowed
  ) {
    if (!blocked.includes("CROSS_DOMAIN")) {
      blocked.push("CROSS_DOMAIN");
    }
  }

  // File upload check
  if (classification.requires_file && !config.fileUploadAllowed) {
    // Don't block, but note it
  }

  const allowed = blocked.length === 0;

  // Generate CTA only if something was blocked
  let cta: AccessCheckResult["cta"] = null;
  if (!allowed && tier !== "max") {
    const ctaMsg = CTA_MESSAGES[tier as Exclude<Tier, "max">];
    if (ctaMsg) {
      cta = ctaMsg;
    }
  }

  return { allowed, blockedIntents: blocked, cta };
}

// ── Check daily request limit ───────────────────────────────────

export function checkDailyRequestLimit(
  tier: Tier,
  currentCount: number
): { allowed: boolean; remaining: number; limit: number } {
  const config = getTierConfig(tier);
  const remaining = config.dailyRequestLimit - currentCount;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: config.dailyRequestLimit,
  };
}

// ── Build post-processing additions ─────────────────────────────

export interface PostProcessAdditions {
  disclaimer: string;
  knowledgeTimestamp: string;
  cta: string | null;
  productFooter: string | null;
}

export function buildPostProcessing(
  tier: Tier,
  language: "bangla" | "english" | "mixed",
  blockedIntents: Intent[],
  urgency: string,
  knowledgeBaseDate: string = "2025-12-15",
  productMatch?: ProductMatchResult | null,
  liveServices?: LiveService[]
): PostProcessAdditions {
  // Disclaimer — always appended
  const disclaimer =
    language === "bangla"
      ? LEGAL_DISCLAIMER.bn
      : language === "mixed"
        ? LEGAL_DISCLAIMER.both
        : LEGAL_DISCLAIMER.en;

  // Knowledge timestamp — always appended
  const timestamps = getKnowledgeTimestamp(knowledgeBaseDate);
  const knowledgeTimestamp =
    language === "bangla" ? timestamps.bn : timestamps.en;

  // CTA — max 1, soft on crisis
  let cta: string | null = null;
  if (blockedIntents.length > 0 && tier !== "max") {
    const ctaMsg = CTA_MESSAGES[tier as Exclude<Tier, "max">];
    if (ctaMsg) {
      // Soft CTA for crisis queries
      if (urgency === "crisis") {
        cta = null; // No aggressive upsell during crisis
      } else {
        cta = language === "bangla" ? ctaMsg.textBn : ctaMsg.text;
      }
    }
  }

  // Product footer — ONLY for contextual/tier_exceed triggers
  // Direct inquiries (Category 1) are handled in the main AI response, not here
  let productFooter: string | null = null;
  if (
    productMatch &&
    productMatch.product.status === "live" &&
    productMatch.trigger !== "direct"
  ) {
    const p = productMatch.product;
    const isBn = language === "bangla";

    // Build footer with actual services if available
    let footer = isBn
      ? `💼 ${p.nameBn} — ${p.descriptionBn}`
      : `💼 ${p.name} — ${p.description}`;

    if (liveServices && liveServices.length > 0) {
      const serviceLines = liveServices.slice(0, 3).map((s) => {
        const name = isBn && s.titleBn ? s.titleBn : s.title;
        let line = `  → ${name}`;
        if (s.price) line += ` (৳${s.price})`;
        if (s.deliveryTimeline) line += ` — ${s.deliveryTimeline}`;
        return line;
      });
      footer += "\n" + serviceLines.join("\n");
      const requestCategory = liveServices[0].category;
      footer += isBn
        ? `\n  📋 [সেবা অনুরোধ করুন →](/services?request=${requestCategory})`
        : `\n  📋 [Request this service →](/services?request=${requestCategory})`;
    }

    productFooter = footer;
  }

  return { disclaimer, knowledgeTimestamp, cta, productFooter };
}
