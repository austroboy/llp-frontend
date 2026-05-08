import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSelf, requireUser, requireAdmin } from "./_lib/auth";

export const listByUser = query({
  args: {
    userId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit }) => {
    await requireSelf(ctx, userId);
    const results = await ctx.db
      .query("personalServiceRequests")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 50);
    return results;
  },
});

export const getById = query({
  args: { requestId: v.id("personalServiceRequests") },
  handler: async (ctx, { requestId }) => {
    const identity = await requireUser(ctx);
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Not found");
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && req.userId !== identity.subject) {
      throw new Error("Forbidden");
    }
    return req;
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    category: v.string(),
    subject: v.string(),
    description: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { userId, category, subject, description, attachments }) => {
    const identity = await requireUser(ctx);
    // Force userId to authenticated subject — never trust arg.
    const now = Date.now();
    return await ctx.db.insert("personalServiceRequests", {
      userId: identity.subject,
      category,
      subject,
      description,
      status: "submitted",
      attachments,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    requestId: v.id("personalServiceRequests"),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("awaiting_input"),
      v.literal("in_progress"),
      v.literal("delivered"),
      v.literal("closed"),
    ),
  },
  handler: async (ctx, { requestId, status }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(requestId, { status, updatedAt: Date.now() });
  },
});
