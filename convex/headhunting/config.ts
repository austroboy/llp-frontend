import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_lib/auth";

// ═══════════════════════════════════════════════════════════════
// Configurable Business Rules
// ═══════════════════════════════════════════════════════════════

// Default rules (used when no DB entry exists)
const DEFAULTS: Record<string, { value: string; label: string; category: string }> = {
  default_fee_formula: { value: "percentage:20", label: "Default Fee Formula", category: "fees" },
  default_fee_pct_manager: { value: "15", label: "Fee % — Manager & Below", category: "fees" },
  default_fee_pct_director: { value: "20", label: "Fee % — Director Level", category: "fees" },
  default_fee_pct_vp: { value: "25", label: "Fee % — VP+ / C-Suite", category: "fees" },
  protection_months_manager: { value: "3", label: "Protection Window — Manager (months)", category: "protection" },
  protection_months_director: { value: "6", label: "Protection Window — Director (months)", category: "protection" },
  protection_months_vp: { value: "12", label: "Protection Window — VP+ (months)", category: "protection" },
  scout_payout_pct: { value: "30", label: "Scout Payout % of Fee", category: "fees" },
  brief_expiry_days: { value: "30", label: "Brief Expiry (days)", category: "briefs" },
  match_score_threshold: { value: "50", label: "Min Match Score for Auto-Surface", category: "matching" },
  max_opportunities_per_candidate: { value: "5", label: "Max Active Opportunities per Candidate", category: "matching" },
  quota_tier_S: { value: "10", label: "S-tier max submissions per mandate", category: "briefs" },
  quota_tier_P: { value: "7", label: "P-tier max submissions per mandate", category: "briefs" },
  quota_tier_E: { value: "5", label: "E-tier max submissions per mandate", category: "briefs" },
  quota_tier_N: { value: "3", label: "N-tier max submissions per mandate", category: "briefs" },
};

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const dbRules = await ctx.db.query("htConfigRules").collect();
    const dbMap = new Map(dbRules.map((r) => [r.key, r]));

    // Merge defaults with DB overrides
    const rules = Object.entries(DEFAULTS).map(([key, def]) => {
      const dbRule = dbMap.get(key);
      return {
        key,
        value: dbRule?.value ?? def.value,
        label: def.label,
        category: def.category,
        updatedBy: dbRule?.updatedBy,
        updatedAt: dbRule?.updatedAt,
        isDefault: !dbRule,
      };
    });
    return rules;
  },
});

export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const dbRules = await ctx.db
      .query("htConfigRules")
      .withIndex("by_category", (q) =>
        q.eq("category", args.category as "fees")
      )
      .collect();

    // Merge with defaults for this category
    const defaults = Object.entries(DEFAULTS).filter(
      ([, def]) => def.category === args.category
    );
    const dbMap = new Map(dbRules.map((r) => [r.key, r]));

    return defaults.map(([key, def]) => {
      const dbRule = dbMap.get(key);
      return {
        key,
        value: dbRule?.value ?? def.value,
        label: def.label,
        category: def.category,
        isDefault: !dbRule,
      };
    });
  },
});

export const getValue = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rule = await ctx.db
      .query("htConfigRules")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (rule) return rule.value;
    return DEFAULTS[args.key]?.value ?? null;
  },
});

export const upsert = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("htConfigRules")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const def = DEFAULTS[args.key];
    if (!def) throw new Error(`Unknown config key: ${args.key}`);

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedBy: args.updatedBy,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("htConfigRules", {
        key: args.key,
        value: args.value,
        label: def.label,
        category: def.category as "fees",
        updatedBy: args.updatedBy,
        updatedAt: now,
      });
    }
  },
});

/**
 * Seed default quota config values if they don't exist.
 */
export const seedQuotaDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const quotaKeys = ["quota_tier_S", "quota_tier_P", "quota_tier_E", "quota_tier_N"];

    for (const key of quotaKeys) {
      const def = DEFAULTS[key];
      if (!def) continue;

      const existing = await ctx.db
        .query("htConfigRules")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      if (!existing) {
        await ctx.db.insert("htConfigRules", {
          key,
          value: def.value,
          label: def.label,
          category: def.category as "briefs",
          updatedAt: Date.now(),
        });
      }
    }

    return { seeded: true };
  },
});
