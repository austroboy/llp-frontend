import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireSelf } from "../_lib/auth";

/**
 * Get all candidates in this scout's pending review queue.
 */
export const getMyPendingQueue = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const submissions = await ctx.db
      .query("htSubmissions")
      .withIndex("by_scout_status", (q) =>
        q.eq("scoutId", args.scoutId).eq("status", "pending_scout_review")
      )
      .collect();

    // Enrich with mandate info
    const results = [];
    for (const sub of submissions) {
      const mandate = await ctx.db.get(sub.mandateId);
      const blueprint = mandate
        ? await ctx.db
            .query("htRoleBlueprints")
            .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
            .order("desc")
            .first()
        : null;

      results.push({
        ...sub,
        mandateTitle: blueprint?.title ?? mandate?.rawTitle ?? "Unknown",
        mandateFunction: blueprint?.function,
        mandateSeniority: blueprint?.seniority,
      });
    }

    return results;
  },
});

/**
 * Scout submits a candidate from their queue to LLP.
 * This is the point where quota is consumed.
 */
export const submitToLLP = mutation({
  args: {
    submissionId: v.id("htSubmissions"),
    scoutRecommendationScore: v.number(),
    scoutRecommendationNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    if (submission.scoutId !== identity.subject) throw new Error("Forbidden");
    if (submission.status !== "pending_scout_review") {
      throw new Error("Submission is not in pending scout review status");
    }

    // Validate recommendation score (1-10)
    if (args.scoutRecommendationScore < 1 || args.scoutRecommendationScore > 10) {
      throw new Error("Recommendation score must be between 1 and 10");
    }

    // Find and increment slot on the brief release
    if (submission.scoutId && submission.referralCode) {
      const release = await ctx.db
        .query("htBriefReleases")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", submission.referralCode!))
        .first();

      if (release) {
        const maxSlots = release.slotsAllocated ?? 7;
        const used = release.slotsUsed ?? 0;
        if (used >= maxSlots) {
          throw new Error("Submission slots exhausted — cannot submit to LLP");
        }
        await ctx.db.patch(release._id, { slotsUsed: used + 1 });
      }
    }

    // Transition status and save recommendation
    await ctx.db.patch(args.submissionId, {
      status: "submitted_to_llp",
      scoutRecommendationScore: args.scoutRecommendationScore,
      scoutRecommendationNote: args.scoutRecommendationNote,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Scout rejects a candidate from their queue.
 * Does NOT consume quota.
 */
export const rejectFromQueue = mutation({
  args: {
    submissionId: v.id("htSubmissions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    if (submission.scoutId !== identity.subject) throw new Error("Forbidden");
    if (submission.status !== "pending_scout_review") {
      throw new Error("Submission is not in pending scout review status");
    }

    await ctx.db.patch(args.submissionId, {
      status: "rejected",
      scoutRejected: true,
      scoutRejectionReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get queue count for a scout (for badge display).
 */
export const getPendingQueueCount = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const submissions = await ctx.db
      .query("htSubmissions")
      .withIndex("by_scout_status", (q) =>
        q.eq("scoutId", args.scoutId).eq("status", "pending_scout_review")
      )
      .collect();
    return submissions.length;
  },
});

/**
 * Get slot info for a scout on a specific mandate.
 */
export const getSlotInfo = query({
  args: { scoutId: v.string(), mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const release = await ctx.db
      .query("htBriefReleases")
      .withIndex("by_scout_mandate", (q) =>
        q.eq("scoutId", args.scoutId).eq("mandateId", args.mandateId)
      )
      .first();

    if (!release) return null;

    return {
      allocated: release.slotsAllocated ?? 7,
      used: release.slotsUsed ?? 0,
      remaining: (release.slotsAllocated ?? 7) - (release.slotsUsed ?? 0),
      referralCode: release.referralCode,
    };
  },
});
