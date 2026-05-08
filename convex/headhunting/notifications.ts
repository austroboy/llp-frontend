import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { requireAdmin, requireSelf, requireUser } from "../_lib/auth";

/**
 * Headhunting Notifications (Phase 2)
 *
 * In-app notification system for headhunting events.
 * 13 event types covering the full mandate lifecycle.
 */

// ── Queries ──────────────────────────────────────────────────────────

export const getByUser = query({
  args: { clerkId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    return ctx.db
      .query("htNotifications")
      .withIndex("by_recipient", (q) => q.eq("recipientClerkId", args.clerkId))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const getUnreadCount = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    const unread = await ctx.db
      .query("htNotifications")
      .withIndex("by_recipient_read", (q) =>
        q.eq("recipientClerkId", args.clerkId).eq("read", false)
      )
      .collect();
    return unread.length;
  },
});

// ── Mutations ────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    recipientClerkId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    mandateId: v.optional(v.id("htMandates")),
  },
  handler: async (ctx, args) => {
    // Notifications can be created by admins (system events) only —
    // recipients shouldn't be able to forge notifications for themselves
    // or others.
    await requireAdmin(ctx);
    return ctx.db.insert("htNotifications", {
      recipientClerkId: args.recipientClerkId,
      type: args.type as "mandate_new",
      title: args.title,
      body: args.body,
      link: args.link,
      mandateId: args.mandateId,
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const markRead = mutation({
  args: { id: v.id("htNotifications") },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Notification not found");
    if (note.recipientClerkId !== identity.subject) {
      throw new Error("Forbidden");
    }
    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllRead = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    const unread = await ctx.db
      .query("htNotifications")
      .withIndex("by_recipient_read", (q) =>
        q.eq("recipientClerkId", args.clerkId).eq("read", false)
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
    return unread.length;
  },
});
