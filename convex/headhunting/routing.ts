import { query, mutation } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOrgUser } from "../lib/orgGuard";
import { requireAdmin } from "../_lib/auth";

// ─── Default Routing Weights ────────────────────────────────────

const DEFAULT_WEIGHTS = {
  functionFit: 0.25,
  sectorFit: 0.20,
  levelFit: 0.15,
  geographyFit: 0.10,
  historicalSuccess: 0.10,
  networkDepth: 0.10,
  responseQuality: 0.05,
  languageFit: 0.05,
};

// ─── Confidentiality Tier Mapping ───────────────────────────────

/**
 * Maps blueprint confidentiality levels to a numeric tier.
 * Higher number = stricter confidentiality.
 */
const CONFIDENTIALITY_TIERS: Record<string, number> = {
  disclosed: 1,
  open: 1,
  partial_clue: 2,
  standard: 2,
  full_mask: 3,
  confidential: 3,
  highly_confidential: 4,
  executive_confidential: 5,
};

/**
 * Maps scout confidentialitySuitability levels to a numeric tier.
 * A scout must have tier >= blueprint tier.
 */
const SCOUT_SUITABILITY_TIERS: Record<string, number> = {
  restricted: 1,
  standard: 2,
  trusted: 3,
  high_discretion: 4,
  executive_confidential: 5,
};

// ─── Score Dimension Helpers ────────────────────────────────────

/**
 * Compute function fit score.
 * - exact match in primary = 100
 * - exact match in secondary = 75
 * - partial / adjacent match = 50
 * - no match = 0
 */
function computeFunctionFit(
  scoutFunctionPrimary: string[] | undefined,
  scoutFunctionSecondary: string[] | undefined,
  blueprintFunction: string | undefined
): number {
  if (!blueprintFunction) return 50; // unknown
  const target = blueprintFunction.toLowerCase();

  if (scoutFunctionPrimary?.some((f) => f.toLowerCase() === target)) return 100;
  if (scoutFunctionSecondary?.some((f) => f.toLowerCase() === target)) return 75;

  // Adjacent match: partial string overlap
  if (
    scoutFunctionPrimary?.some(
      (f) => f.toLowerCase().includes(target) || target.includes(f.toLowerCase())
    )
  )
    return 50;
  if (
    scoutFunctionSecondary?.some(
      (f) => f.toLowerCase().includes(target) || target.includes(f.toLowerCase())
    )
  )
    return 40;

  return 0;
}

/**
 * Compute sector/industry fit score.
 * Proportion of target sectors covered by scout's industries * 100.
 */
function computeSectorFit(
  scoutIndustryPrimary: string[] | undefined,
  scoutIndustrySecondary: string[] | undefined,
  targetSectors: string[] | undefined,
  blueprintIndustry: string | undefined
): number {
  const allScoutIndustries = [
    ...(scoutIndustryPrimary ?? []),
    ...(scoutIndustrySecondary ?? []),
  ].map((s) => s.toLowerCase());

  if (allScoutIndustries.length === 0) return 50; // unknown

  const targets = [
    ...(targetSectors ?? []),
    ...(blueprintIndustry ? [blueprintIndustry] : []),
  ].map((s) => s.toLowerCase());

  if (targets.length === 0) return 50; // no targets specified

  let matches = 0;
  for (const target of targets) {
    if (
      allScoutIndustries.some(
        (ind) => ind === target || ind.includes(target) || target.includes(ind)
      )
    ) {
      matches++;
    }
  }

  return Math.round((matches / targets.length) * 100);
}

/**
 * Compute role level fit.
 * Check if scout's roleLevelReach covers the blueprint's roleBand.
 */
function computeLevelFit(
  scoutRoleLevelReach: string[] | undefined,
  blueprintRoleBand: string | undefined
): number {
  if (!blueprintRoleBand) return 50;
  if (!scoutRoleLevelReach || scoutRoleLevelReach.length === 0) return 50;

  // Map roleBand to typical labels scouts might use
  const roleBandLabels: Record<string, string[]> = {
    entry_junior: ["entry", "junior", "entry/junior", "entry_junior", "graduate", "analyst"],
    management_functional: [
      "management",
      "functional",
      "management/functional",
      "management_functional",
      "manager",
      "senior manager",
      "director",
      "mid-level",
      "mid level",
    ],
    executive_clevel: [
      "executive",
      "c-level",
      "c-suite",
      "clevel",
      "executive_clevel",
      "cxo",
      "vp",
      "svp",
      "evp",
      "president",
      "board",
    ],
  };

  const targetLabels = roleBandLabels[blueprintRoleBand] ?? [];
  const scoutLabels = scoutRoleLevelReach.map((r) => r.toLowerCase());

  for (const target of targetLabels) {
    if (
      scoutLabels.some(
        (r) => r === target || r.includes(target) || target.includes(r)
      )
    ) {
      return 100;
    }
  }

  return 0;
}

/**
 * Compute geography fit.
 * Check if scout's sourcing markets or countries supported cover the mandate's location/geography.
 */
function computeGeographyFit(
  scoutCountriesSupported: string[] | undefined,
  scoutPrimarySourcingMarkets: { country: string; strength: string; type: string }[] | undefined,
  blueprintLocation: string | undefined,
  blueprintGeography: string | undefined
): number {
  const target = (blueprintLocation || blueprintGeography || "").toLowerCase();
  if (!target) return 50;

  // Check primarySourcingMarkets
  if (scoutPrimarySourcingMarkets && scoutPrimarySourcingMarkets.length > 0) {
    for (const market of scoutPrimarySourcingMarkets) {
      const country = market.country.toLowerCase();
      if (country === target || country.includes(target) || target.includes(country)) {
        // Give bonus for "Strong" markets
        if (market.strength === "Strong") return 100;
        if (market.strength === "Moderate") return 80;
        return 60;
      }
    }
  }

  // Check countriesSupported
  if (scoutCountriesSupported && scoutCountriesSupported.length > 0) {
    for (const country of scoutCountriesSupported) {
      if (
        country.toLowerCase() === target ||
        country.toLowerCase().includes(target) ||
        target.includes(country.toLowerCase())
      ) {
        return 100;
      }
    }
  }

  return 0;
}

/**
 * Compute historical success score.
 * Based on htScoutPerformanceEvents — placements vs submissions ratio.
 * Returns a value from 0-100, default 50 if no data.
 */
async function computeHistoricalSuccess(
  ctx: QueryCtx,
  scoutClerkId: string
): Promise<number> {
  const events = await ctx.db
    .query("htScoutPerformanceEvents")
    .withIndex("by_scout", (q) => q.eq("scoutId", scoutClerkId))
    .collect();

  if (events.length === 0) return 50;

  const submissions = events.filter(
    (e) => e.eventType === "submission_created"
  ).length;
  const placements = events.filter(
    (e) => e.eventType === "placement_confirmed"
  ).length;
  const shortlisted = events.filter(
    (e) => e.eventType === "submission_shortlisted"
  ).length;

  if (submissions === 0) return 50;

  // Weighted: placements worth 3x, shortlists worth 1x
  const score = Math.min(
    100,
    Math.round(((placements * 3 + shortlisted) / submissions) * 50)
  );
  return Math.max(10, score); // Floor of 10 if they have any activity
}

/**
 * Compute network depth score.
 * How many of the scout's networkDepthTags match the mandate needs.
 */
function computeNetworkDepth(
  scoutNetworkDepthTags: string[] | undefined,
  blueprintTargetSectors: string[] | undefined,
  blueprintFunction: string | undefined
): number {
  if (!scoutNetworkDepthTags || scoutNetworkDepthTags.length === 0) return 50;

  const needs = [
    ...(blueprintTargetSectors ?? []),
    ...(blueprintFunction ? [blueprintFunction] : []),
  ].map((n) => n.toLowerCase());

  if (needs.length === 0) return 50;

  let matches = 0;
  for (const need of needs) {
    if (
      scoutNetworkDepthTags.some(
        (tag) =>
          tag.toLowerCase() === need ||
          tag.toLowerCase().includes(need) ||
          need.includes(tag.toLowerCase())
      )
    ) {
      matches++;
    }
  }

  return Math.round((matches / needs.length) * 100);
}

/**
 * Compute language fit.
 * Check if scout speaks language required by the mandate.
 */
function computeLanguageFit(
  scoutCountriesSupported: string[] | undefined,
  blueprintLanguageRequirement: string[] | undefined
): number {
  if (!blueprintLanguageRequirement || blueprintLanguageRequirement.length === 0)
    return 50;

  // Without explicit language data on the scout, we use countriesSupported
  // as a proxy (Bangladesh -> Bangla/English, India -> Hindi/English, etc.)
  // This is a simplification — in a real system, scout profiles would have
  // explicit language fields.
  if (!scoutCountriesSupported || scoutCountriesSupported.length === 0) return 50;

  // Simple heuristic: if scout covers countries, assume language compatibility
  return 75;
}

// ─── Main Query ─────────────────────────────────────────────────

/**
 * Get eligible scouts for a blueprint, with weighted relevance scores.
 *
 * Pipeline:
 * 1. Resolve blueprint -> mandate -> client for context
 * 2. Get all approved scouts
 * 3. Apply hard filters (active, confidentiality, capacity)
 * 4. Compute weighted relevance score
 * 5. Run conflict check
 * 6. Return sorted by score
 */
export const getEligibleScouts = query({
  args: { blueprintId: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // ── Step 1: Resolve context ──
    const blueprint = await ctx.db.get(args.blueprintId);
    if (!blueprint) throw new ConvexError("Blueprint not found");

    const mandate = await ctx.db.get(blueprint.mandateId);
    if (!mandate) throw new ConvexError("Mandate not found");

    const client = await ctx.db.get(mandate.clientId);
    if (!client) throw new ConvexError("Client not found");

    const clientCompanyNormalized = client.companyName.toLowerCase().trim();

    // ── Step 2: Get all approved scouts ──
    const allScouts = await ctx.db
      .query("htScoutProfiles")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    // ── Step 3 & 4: Filter and score ──
    const now = Date.now();
    const blueprintConfidentialityTier =
      CONFIDENTIALITY_TIERS[blueprint.confidentialityLevel] ?? 2;

    const scoredScouts: {
      scoutClerkId: string;
      name: string;
      score: number;
      breakdown: { dimension: string; score: number }[];
      eligible: boolean;
      filterReason?: string;
      conflictStatus?: string;
    }[] = [];

    for (const scout of allScouts) {
      // ── Hard Filter: Confidentiality ──
      const scoutSuitability = scout.confidentialitySuitability ?? "standard";
      const scoutTier = SCOUT_SUITABILITY_TIERS[scoutSuitability] ?? 2;

      if (scoutTier < blueprintConfidentialityTier) {
        scoredScouts.push({
          scoutClerkId: scout.clerkId,
          name: scout.fullName,
          score: 0,
          breakdown: [],
          eligible: false,
          filterReason: `Confidentiality: scout is "${scoutSuitability}" (tier ${scoutTier}) but blueprint requires tier ${blueprintConfidentialityTier}`,
        });
        continue;
      }

      // ── Hard Filter: Capacity ──
      const maxMandates = scout.maxActiveMandates ?? 10;
      // Count active brief releases for this scout
      const activeReleases = await ctx.db
        .query("htBriefReleases")
        .withIndex("by_scout", (q) => q.eq("scoutId", scout.clerkId))
        .collect();
      // Filter to only count releases where the mandate is still active
      // (simplified: count all releases as active — a more complete version
      // would check mandate status)
      const activeCount = activeReleases.length;

      if (activeCount >= maxMandates) {
        scoredScouts.push({
          scoutClerkId: scout.clerkId,
          name: scout.fullName,
          score: 0,
          breakdown: [],
          eligible: false,
          filterReason: `Capacity: ${activeCount}/${maxMandates} active mandates`,
        });
        continue;
      }

      // ── Step 4: Compute weighted relevance score ──

      const functionFit = computeFunctionFit(
        scout.functionPrimary,
        scout.functionSecondary,
        blueprint.function
      );

      const sectorFit = computeSectorFit(
        scout.industryPrimary,
        scout.industrySecondary,
        blueprint.targetSectors,
        blueprint.industry
      );

      const levelFit = computeLevelFit(
        scout.roleLevelReach,
        blueprint.roleBand
      );

      const geographyFit = computeGeographyFit(
        scout.countriesSupported,
        scout.primarySourcingMarkets,
        blueprint.location,
        blueprint.searchGeography
      );

      const historicalSuccess = await computeHistoricalSuccess(
        ctx,
        scout.clerkId
      );

      const networkDepth = computeNetworkDepth(
        scout.networkDepthTags,
        blueprint.targetSectors,
        blueprint.function
      );

      const responseQuality = 50; // Default — no data yet

      const languageFit = computeLanguageFit(
        scout.countriesSupported,
        blueprint.languageRequirement
      );

      // Use custom routing weights if set on blueprint, otherwise defaults
      const w = (blueprint.routingWeights as Record<string, number> | undefined) ?? DEFAULT_WEIGHTS;
      const wFunc = w.functionFit ?? DEFAULT_WEIGHTS.functionFit;
      const wSector = w.sectorFit ?? DEFAULT_WEIGHTS.sectorFit;
      const wLevel = w.levelFit ?? DEFAULT_WEIGHTS.levelFit;
      const wGeo = w.geographyFit ?? DEFAULT_WEIGHTS.geographyFit;
      const wHist = w.historicalSuccess ?? DEFAULT_WEIGHTS.historicalSuccess;
      const wNet = w.networkDepth ?? DEFAULT_WEIGHTS.networkDepth;
      const wResp = w.responseQuality ?? DEFAULT_WEIGHTS.responseQuality;
      const wLang = w.languageFit ?? DEFAULT_WEIGHTS.languageFit;

      const score = Math.round(
        functionFit * wFunc +
          sectorFit * wSector +
          levelFit * wLevel +
          geographyFit * wGeo +
          historicalSuccess * wHist +
          networkDepth * wNet +
          responseQuality * wResp +
          languageFit * wLang
      );

      const breakdown = [
        { dimension: "functionFit", score: functionFit },
        { dimension: "sectorFit", score: sectorFit },
        { dimension: "levelFit", score: levelFit },
        { dimension: "geographyFit", score: geographyFit },
        { dimension: "historicalSuccess", score: historicalSuccess },
        { dimension: "networkDepth", score: networkDepth },
        { dimension: "responseQuality", score: responseQuality },
        { dimension: "languageFit", score: languageFit },
      ];

      // ── Conflict Check (inline) ──
      let conflictStatus: string | undefined;
      const conflicts = await ctx.db
        .query("htConflictRecords")
        .withIndex("by_scout_active", (q) =>
          q.eq("scoutClerkId", scout.clerkId).eq("isActive", true)
        )
        .collect();

      for (const conflict of conflicts) {
        if (conflict.companyNameNormalized !== clientCompanyNormalized) continue;

        if (conflict.conflictType === "recent_employer" && conflict.endDate) {
          const coolingMs =
            conflict.coolingPeriodMonths * 30 * 24 * 60 * 60 * 1000;
          if (conflict.endDate + coolingMs <= now) continue; // expired
        }

        conflictStatus = `blocked:${conflict.conflictType}`;
        break;
      }

      scoredScouts.push({
        scoutClerkId: scout.clerkId,
        name: scout.fullName,
        score,
        breakdown,
        eligible: true,
        conflictStatus,
      });
    }

    // Sort eligible scouts by score descending, then ineligible at bottom
    scoredScouts.sort((a, b) => {
      if (a.eligible && !b.eligible) return -1;
      if (!a.eligible && b.eligible) return 1;
      return b.score - a.score;
    });

    return { scouts: scoredScouts };
  },
});

// ─── Routing Weight Tuning ──────────────────────────────────────

/**
 * Set custom routing weights for a blueprint.
 * Weights should sum to approximately 1.0.
 *
 * Shape: { functionFit, sectorFit, levelFit, geographyFit,
 *          historicalSuccess, networkDepth, responseQuality, languageFit }
 */
export const setRoutingWeights = mutation({
  args: {
    blueprintId: v.id("htRoleBlueprints"),
    weights: v.object({
      functionFit: v.number(),
      sectorFit: v.number(),
      levelFit: v.number(),
      geographyFit: v.number(),
      historicalSuccess: v.number(),
      networkDepth: v.number(),
      responseQuality: v.number(),
      languageFit: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await requireOrgUser(ctx);

    const bp = await ctx.db.get(args.blueprintId);
    if (!bp) throw new ConvexError("Blueprint not found");

    // Validate weights sum to approximately 1.0 (allow 0.01 tolerance)
    const sum =
      args.weights.functionFit +
      args.weights.sectorFit +
      args.weights.levelFit +
      args.weights.geographyFit +
      args.weights.historicalSuccess +
      args.weights.networkDepth +
      args.weights.responseQuality +
      args.weights.languageFit;

    if (Math.abs(sum - 1.0) > 0.01) {
      throw new ConvexError(
        `Weights must sum to 1.0 (currently ${sum.toFixed(4)}). Please adjust.`
      );
    }

    // Validate no negative weights
    for (const [key, value] of Object.entries(args.weights)) {
      if (value < 0) {
        throw new ConvexError(`Weight "${key}" cannot be negative (${value})`);
      }
    }

    await ctx.db.patch(args.blueprintId, {
      routingWeights: args.weights,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get current routing weights for a blueprint (or defaults if none set).
 */
export const getRoutingWeights = query({
  args: { blueprintId: v.id("htRoleBlueprints") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const bp = await ctx.db.get(args.blueprintId);
    if (!bp) throw new ConvexError("Blueprint not found");

    const custom = bp.routingWeights as Record<string, number> | undefined;

    return {
      weights: custom ?? DEFAULT_WEIGHTS,
      isCustom: !!custom,
    };
  },
});
