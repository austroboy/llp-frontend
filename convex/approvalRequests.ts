import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireUser, requireSelf } from "./_lib/auth";

// Admin-only: full pending queue.
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let results;
    if (args.status) {
      results = await ctx.db
        .query("approvalRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db
        .query("approvalRequests")
        .order("desc")
        .collect();
    }
    if (args.type) {
      return results.filter((r) => r.type === args.type);
    }
    return results;
  },
});

export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    return await ctx.db
      .query("approvalRequests")
      .withIndex("by_requestedBy", (q) => q.eq("requestedBy", args.userId))
      .order("desc")
      .collect();
  },
});

export const getByResourceId = query({
  args: { resourceId: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("approvalRequests")
      .withIndex("by_resourceId", (q) => q.eq("resourceId", args.resourceId))
      .order("desc")
      .first();
  },
});

export const create = mutation({
  args: {
    type: v.string(),
    resourceId: v.string(),
    title: v.string(),
    requestedBy: v.string(),
    requesterName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    return await ctx.db.insert("approvalRequests", {
      ...args,
      // Force requestedBy to authenticated subject.
      requestedBy: identity.subject,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const approve = mutation({
  args: {
    id: v.id("approvalRequests"),
    reviewedBy: v.string(),
    reviewerName: v.string(),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Approval request not found");

    await ctx.db.patch(args.id, {
      status: "approved",
      reviewedBy: identity.subject,
      reviewerName: args.reviewerName,
      reviewedAt: Date.now(),
      reviewNote: args.reviewNote,
    });

    // If blog post, publish it
    if (request.type === "blog_post") {
      const postId = ctx.db.normalizeId("blogPosts", request.resourceId);
      if (postId) {
        const post = await ctx.db.get(postId);
        if (post) {
          await ctx.db.patch(postId, {
            status: "published",
            publishedAt: post.publishedAt ?? Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }
  },
});

export const reject = mutation({
  args: {
    id: v.id("approvalRequests"),
    reviewedBy: v.string(),
    reviewerName: v.string(),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Approval request not found");

    await ctx.db.patch(args.id, {
      status: "rejected",
      reviewedBy: identity.subject,
      reviewerName: args.reviewerName,
      reviewedAt: Date.now(),
      reviewNote: args.reviewNote,
    });

    // If blog post, revert to draft
    if (request.type === "blog_post") {
      const postId = ctx.db.normalizeId("blogPosts", request.resourceId);
      if (postId) {
        await ctx.db.patch(postId, {
          status: "draft",
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pending = await ctx.db
      .query("approvalRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return pending.length;
  },
});

export const remove = mutation({
  args: { id: v.id("approvalRequests") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
