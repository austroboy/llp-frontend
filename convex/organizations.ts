import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireSelf } from "./_lib/auth";

export const getByCreator = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    await requireSelf(ctx, clerkId);
    return await ctx.db
      .query("organizations")
      .withIndex("by_creator", (q) => q.eq("createdByClerkId", clerkId))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    primaryContactName: v.optional(v.string()),
    primaryContactDesignation: v.optional(v.string()),
    primaryContactEmail: v.optional(v.string()),
    primaryContactPhone: v.optional(v.string()),
    createdByClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    // Force createdByClerkId to authenticated subject — never trust arg.
    return await ctx.db.insert("organizations", {
      ...args,
      createdByClerkId: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    primaryContactName: v.optional(v.string()),
    primaryContactDesignation: v.optional(v.string()),
    primaryContactEmail: v.optional(v.string()),
    primaryContactPhone: v.optional(v.string()),
    billingContactEmail: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, ...fields }) => {
    const identity = await requireUser(ctx);
    const org = await ctx.db.get(orgId);
    if (!org) throw new Error("Not found");
    if (org.createdByClerkId !== identity.subject) {
      const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
      if (role !== "admin") throw new Error("Forbidden");
    }
    const updates: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) updates[k] = v;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(orgId, updates);
    }
  },
});
