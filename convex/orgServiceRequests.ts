import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireAdmin } from "./_lib/auth";

export const listByOrg = query({
  args: {
    orgId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, limit }) => {
    const identity = await requireUser(ctx);
    const org = await ctx.db.get(orgId);
    if (!org) throw new Error("Not found");
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && org.createdByClerkId !== identity.subject) {
      throw new Error("Forbidden");
    }
    return await ctx.db
      .query("orgServiceRequests")
      .withIndex("by_org_time", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(limit ?? 50);
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    requestedByClerkId: v.string(),
    serviceType: v.string(),
    subject: v.string(),
    description: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Not found");
    if (org.createdByClerkId !== identity.subject) {
      throw new Error("Forbidden");
    }
    const now = Date.now();
    return await ctx.db.insert("orgServiceRequests", {
      ...args,
      requestedByClerkId: identity.subject,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    requestId: v.id("orgServiceRequests"),
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
