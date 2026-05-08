import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./_lib/auth";

// --- Queries ---

// Public-by-design: badges shown on public expert profile pages.
export const listByExpert = query({
  args: { expertId: v.id("experts") },
  handler: async (ctx, args) => {
    const badges = await ctx.db
      .query("expertBadges")
      .withIndex("by_expert", (q) => q.eq("expertId", args.expertId))
      .collect();
    return badges.filter((b) => b.isActive);
  },
});

// Public-by-design: badge browsing on the public directory.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const badges = await ctx.db
      .query("expertBadges")
      .order("desc")
      .collect();
    return badges.filter((b) => b.isActive);
  },
});

// --- Mutations (admin-only) ---

export const award = mutation({
  args: {
    expertId: v.id("experts"),
    badge: v.string(),
    icon: v.optional(v.string()),
    awardedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return await ctx.db.insert("expertBadges", {
      expertId: args.expertId,
      badge: args.badge,
      icon: args.icon,
      // Force awardedBy to authenticated admin subject.
      awardedBy: identity.subject,
      awardedAt: Date.now(),
      isActive: true,
    });
  },
});

export const updateIcon = mutation({
  args: {
    id: v.id("expertBadges"),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { icon: args.icon });
  },
});

export const revoke = mutation({
  args: { id: v.id("expertBadges") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      isActive: false,
    });
  },
});
