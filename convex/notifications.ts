import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSelf, requireAdmin, requireUser } from "./_lib/auth";

export const getByUser = query({
  args: {
    userId: v.string(),
    accountType: v.union(v.literal("personal"), v.literal("organization")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, accountType, limit }) => {
    await requireSelf(ctx, userId);
    const results = await ctx.db
      .query("notifications")
      .withIndex("by_user_account", (q) =>
        q.eq("userId", userId).eq("accountType", accountType)
      )
      .order("desc")
      .take(limit ?? 20);
    return results;
  },
});

export const getUnreadCount = query({
  args: {
    userId: v.string(),
    accountType: v.union(v.literal("personal"), v.literal("organization")),
  },
  handler: async (ctx, { userId, accountType }) => {
    await requireSelf(ctx, userId);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_account", (q) =>
        q.eq("userId", userId).eq("accountType", accountType).eq("read", false)
      )
      .collect();
    return unread.length;
  },
});

// Admin-only: notifications are pushed to users by server-side workflows or
// admin tools, never created by arbitrary clients.
export const create = mutation({
  args: {
    userId: v.string(),
    accountType: v.union(v.literal("personal"), v.literal("organization")),
    title: v.string(),
    summary: v.string(),
    targetUrl: v.string(),
  },
  handler: async (ctx, { userId, accountType, title, summary, targetUrl }) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("notifications", {
      userId,
      accountType,
      title,
      summary,
      targetUrl,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const identity = await requireUser(ctx);
    const notification = await ctx.db.get(notificationId);
    if (!notification) throw new Error("Not found");
    if (notification.userId !== identity.subject) throw new Error("Forbidden");
    await ctx.db.patch(notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: {
    userId: v.string(),
    accountType: v.union(v.literal("personal"), v.literal("organization")),
  },
  handler: async (ctx, { userId, accountType }) => {
    await requireSelf(ctx, userId);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_account", (q) =>
        q.eq("userId", userId).eq("accountType", accountType).eq("read", false)
      )
      .collect();
    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});
