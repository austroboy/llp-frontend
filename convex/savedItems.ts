import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSelf } from "./_lib/auth";

export const listByUser = query({
  args: {
    userId: v.string(),
    itemType: v.optional(v.union(v.literal("search_result"), v.literal("ai_draft"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, itemType, limit }) => {
    await requireSelf(ctx, userId);
    if (itemType) {
      const results = await ctx.db
        .query("savedItems")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", userId).eq("itemType", itemType)
        )
        .order("desc")
        .take(limit ?? 50);
      return results;
    }
    const results = await ctx.db
      .query("savedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 50);
    return results;
  },
});

export const isSaved = query({
  args: {
    userId: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, { userId, itemId }) => {
    await requireSelf(ctx, userId);
    const existing = await ctx.db
      .query("savedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("itemId"), itemId))
      .first();
    return !!existing;
  },
});

/** Returns the full row (or null) so callers can tell whether older
 *  records need to be backfilled with content / conversationId. */
export const getByItemId = query({
  args: {
    userId: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, { userId, itemId }) => {
    await requireSelf(ctx, userId);
    const existing = await ctx.db
      .query("savedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("itemId"), itemId))
      .first();
    return existing ?? null;
  },
});

export const save = mutation({
  args: {
    userId: v.string(),
    itemType: v.union(v.literal("search_result"), v.literal("ai_draft")),
    itemId: v.string(),
    title: v.string(),
    preview: v.optional(v.string()),
    content: v.optional(v.string()),
    conversationId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { userId, itemType, itemId, title, preview, content, conversationId }
  ) => {
    await requireSelf(ctx, userId);
    // Prevent duplicates — but backfill content/conversationId if the
    // row was saved before those fields existed.
    const existing = await ctx.db
      .query("savedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("itemId"), itemId))
      .first();
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (content && !existing.content) patch.content = content;
      if (conversationId && !existing.conversationId) {
        patch.conversationId = conversationId;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    return await ctx.db.insert("savedItems", {
      userId,
      itemType,
      itemId,
      title,
      preview,
      content,
      conversationId,
      savedAt: Date.now(),
    });
  },
});

export const unsave = mutation({
  args: {
    userId: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, { userId, itemId }) => {
    await requireSelf(ctx, userId);
    const existing = await ctx.db
      .query("savedItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("itemId"), itemId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
