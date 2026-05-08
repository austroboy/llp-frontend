import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./_lib/auth";

// Admin-only: full list of consultation requests.
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("connected"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("consultationRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("consultationRequests")
      .order("desc")
      .collect();
  },
});

// Public-by-design: anyone (incl. unauthenticated visitors) can submit a
// consultation request. The form sits on the public marketing site.
// We do not gate this — but we strip any client-supplied requesterClerkId if
// it doesn't match the authenticated user, to prevent attribution forgery.
export const create = mutation({
  args: {
    requesterName: v.string(),
    requesterEmail: v.string(),
    requesterPhone: v.optional(v.string()),
    requesterClerkId: v.optional(v.string()),
    expertArea: v.string(),
    description: v.string(),
    urgency: v.union(v.literal("normal"), v.literal("urgent")),
    preferredLanguage: v.union(v.literal("en"), v.literal("bn")),
    expertId: v.optional(v.id("experts")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const requesterClerkId = identity ? identity.subject : undefined;
    return await ctx.db.insert("consultationRequests", {
      ...args,
      requesterClerkId,
      status: "pending",
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("consultationRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("connected"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.adminNotes !== undefined) {
      updates.adminNotes = args.adminNotes;
    }
    if (args.status === "reviewed" || args.status === "connected") {
      updates.respondedAt = Date.now();
    }
    await ctx.db.patch(args.id, updates);
  },
});

export const assignExpert = mutation({
  args: {
    id: v.id("consultationRequests"),
    assignedExpert: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      assignedExpert: args.assignedExpert,
      status: "connected",
      respondedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
