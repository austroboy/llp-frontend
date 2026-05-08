import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireSelf, requireUser, requireAdmin } from "../_lib/auth";

// --- Queries ---

export const getByUser = query({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("interested"),
        v.literal("declined"),
        v.literal("shared"),
        v.literal("withdrawn")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    if (args.status) {
      return await ctx.db
        .query("htOpportunities")
        .withIndex("by_user_status", (q) =>
          q.eq("candidateUserId", args.userId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("htOpportunities")
      .withIndex("by_user", (q) => q.eq("candidateUserId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("htOpportunities") },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    // Caller must be the candidate, OR admin.
    if (doc.candidateUserId !== identity.subject) {
      const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
      if (role !== "admin") {
        const member = await ctx.db
          .query("ctTeamMembers")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
          .first();
        if (!(member?.dashboardRole === "super_admin" && member.isActive)) {
          throw new Error("Forbidden");
        }
      }
    }
    return doc;
  },
});

export const countPending = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    const pending = await ctx.db
      .query("htOpportunities")
      .withIndex("by_user_status", (q) =>
        q.eq("candidateUserId", args.userId).eq("status", "pending")
      )
      .collect();
    return pending.length;
  },
});

// --- Mutations ---

export const respond = mutation({
  args: {
    id: v.id("htOpportunities"),
    userId: v.string(),
    interested: v.boolean(),
    message: v.optional(v.string()),
    shareProfile: v.optional(v.boolean()),
    shareCv: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.userId);
    const opp = await ctx.db.get(args.id);
    if (!opp) throw new Error("Opportunity not found");
    if (opp.candidateUserId !== args.userId)
      throw new Error("Not your opportunity");
    if (opp.status !== "pending")
      throw new Error("Opportunity already responded to");

    const now = Date.now();
    const newStatus = args.interested ? "interested" : "declined";

    await ctx.db.patch(args.id, {
      status: newStatus,
      candidateResponse: {
        interested: args.interested,
        message: args.message,
        sharedProfileAt: args.shareProfile ? now : undefined,
        sharedCvAt: args.shareCv ? now : undefined,
      },
    });
  },
});

// Admin: create an opportunity for a candidate
export const create = mutation({
  args: {
    candidateUserId: v.string(),
    mandateId: v.optional(v.id("htMandates")),
    matchSource: v.union(
      v.literal("ai_match"),
      v.literal("scout_submit"),
      v.literal("agent_manual")
    ),
    matchScore: v.optional(v.number()),
    matchReasons: v.optional(v.array(v.string())),
    roleTitle: v.string(),
    location: v.optional(v.string()),
    salaryRange: v.optional(v.string()),
    companyHint: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("htOpportunities", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});
