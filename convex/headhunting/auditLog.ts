import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_lib/auth";

const entityTypeValidator = v.union(
  v.literal("assignment"),
  v.literal("roleGroup"),
  v.literal("role"),
  v.literal("client")
);

// --- Queries ---

export const getByEntity = query({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("htAuditLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .collect();
  },
});

export const getRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("htAuditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// --- Mutations ---

export const log = mutation({
  args: {
    entityType: entityTypeValidator,
    entityId: v.string(),
    action: v.string(),
    changes: v.optional(v.string()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("htAuditLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
