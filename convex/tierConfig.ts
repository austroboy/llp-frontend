import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_lib/auth";

// Public-by-design: pricing/tier metadata is shown in the public pricing page
// and used by the chat pipeline for guest tier checks. No sensitive data.
export const getByTier = query({
  args: { tier: v.string() },
  handler: async (ctx, { tier }) => {
    return await ctx.db
      .query("tierConfig")
      .withIndex("by_tier", (q) => q.eq("tier", tier))
      .first();
  },
});

// Public-by-design: full tier list shown on pricing page.
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("tierConfig").collect();
  },
});

// Upsert a tier config (admin). Single source of truth — covers both
// runtime intent gating AND pricing/Stripe binding.
export const upsert = mutation({
  args: {
    tier: v.string(),
    label: v.string(),
    tierType: v.optional(v.union(v.literal("free"), v.literal("paid"))),
    requiresAccount: v.optional(v.boolean()),
    allowedIntents: v.array(v.string()),
    dailyRequestLimit: v.number(),
    rateLimit: v.number(),
    fileUploadAllowed: v.boolean(),
    crossDomainAllowed: v.boolean(),
    advisoryAllowed: v.boolean(),
    price: v.optional(v.number()),
    stripeProductId: v.optional(v.union(v.string(), v.null())),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("tierConfig")
      .withIndex("by_tier", (q) => q.eq("tier", args.tier))
      .first();

    const data = { ...args, updatedAt: Date.now() };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("tierConfig", data);
    }
  },
});

// Seed default tier configs (run once). Admin-only — anyone re-running this
// after seed could attempt to overwrite by deleting first via SDK; prevent.
export const seed = mutation({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("tierConfig").collect();
    if (existing.length > 0) return { seeded: false, message: "Tier configs already exist" };

    const configs = [
      {
        tier: "free_guest",
        label: "Free Guest",
        tierType: "free" as const,
        requiresAccount: false,
        allowedIntents: ["FACTUAL", "PROCEDURAL"],
        dailyRequestLimit: 5,
        rateLimit: 5,
        fileUploadAllowed: false,
        crossDomainAllowed: false,
        advisoryAllowed: false,
        stripeProductId: null,
        isActive: true,
        updatedAt: Date.now(),
      },
      {
        tier: "free_subscribed",
        label: "Free Subscribed",
        tierType: "free" as const,
        requiresAccount: true,
        allowedIntents: ["FACTUAL", "PROCEDURAL", "CALCULATION"],
        dailyRequestLimit: 15,
        rateLimit: 10,
        fileUploadAllowed: false,
        crossDomainAllowed: false,
        advisoryAllowed: false,
        stripeProductId: null,
        isActive: true,
        updatedAt: Date.now(),
      },
      {
        tier: "mini",
        label: "Mini — ১৪৯৳/mo",
        tierType: "paid" as const,
        requiresAccount: true,
        allowedIntents: ["FACTUAL", "ADVISORY", "DRAFTING", "CALCULATION", "PROCEDURAL", "CROSS_DOMAIN"],
        dailyRequestLimit: 100,
        rateLimit: 20,
        fileUploadAllowed: false,
        crossDomainAllowed: true,
        advisoryAllowed: false,
        price: 149,
        stripeProductId: null,
        isActive: true,
        updatedAt: Date.now(),
      },
      {
        tier: "max",
        label: "Max — ২৯৯৳/mo",
        tierType: "paid" as const,
        requiresAccount: true,
        allowedIntents: ["FACTUAL", "ADVISORY", "DRAFTING", "CALCULATION", "PROCEDURAL", "CROSS_DOMAIN"],
        dailyRequestLimit: 500,
        rateLimit: 30,
        fileUploadAllowed: true,
        crossDomainAllowed: true,
        advisoryAllowed: true,
        price: 299,
        stripeProductId: null,
        isActive: true,
        updatedAt: Date.now(),
      },
    ];

    for (const config of configs) {
      await ctx.db.insert("tierConfig", config);
    }

    return { seeded: true, message: `Seeded ${configs.length} tier configs` };
  },
});

// Backfill new fields onto rows seeded under the old schema. Idempotent:
// only writes fields that are currently undefined. One-shot maintenance —
// matches `seed` in not requiring admin auth so it can run via Convex CLI.
export const backfillNewFields = mutation({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("tierConfig").collect();
    let patched = 0;
    for (const row of rows) {
      const patch: Record<string, unknown> = {};
      if (row.tierType === undefined) {
        patch.tierType = row.tier === "mini" || row.tier === "max" ? "paid" : "free";
      }
      if (row.requiresAccount === undefined) {
        patch.requiresAccount = row.tier !== "free_guest";
      }
      if (row.stripeProductId === undefined) {
        patch.stripeProductId = null;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(row._id, { ...patch, updatedAt: Date.now() });
        patched++;
      }
    }
    return { patched, total: rows.length };
  },
});
