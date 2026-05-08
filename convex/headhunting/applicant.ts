import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireSelf } from "../_lib/auth";

/**
 * Get all applications for the current user.
 */
export const getMyApplications = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    const submissions = await ctx.db
      .query("htSubmissions")
      .withIndex("by_candidate", (q) => q.eq("candidateUserId", args.clerkId))
      .collect();

    const results = [];
    for (const sub of submissions) {
      const mandate = await ctx.db.get(sub.mandateId);
      let roleTitle = mandate?.rawTitle ?? "Position";

      if (mandate) {
        const blueprint = await ctx.db
          .query("htRoleBlueprints")
          .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
          .order("desc")
          .first();
        if (blueprint) roleTitle = blueprint.title;
      }

      results.push({
        _id: sub._id,
        roleTitle,
        status: sub.status,
        entryMethod: sub.entryMethod,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      });
    }

    return results;
  },
});

/**
 * Get detailed view of a single application (applicant-safe).
 */
export const getApplicationDetail = query({
  args: { submissionId: v.id("htSubmissions"), clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;
    if (submission.candidateUserId !== args.clerkId) return null;

    const mandate = await ctx.db.get(submission.mandateId);
    let roleTitle = mandate?.rawTitle ?? "Position";
    let location: string | undefined;
    let seniority: string | undefined;

    if (mandate) {
      const blueprint = await ctx.db
        .query("htRoleBlueprints")
        .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
        .order("desc")
        .first();
      if (blueprint) {
        roleTitle = blueprint.title;
        location = blueprint.location;
        seniority = blueprint.seniority;
      }
    }

    const screeningRecord = await ctx.db
      .query("htScreeningRecords")
      .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
      .first();

    const visibleComments = (screeningRecord?.comments ?? []).filter(
      (c: any) => (c.visibility ?? "internal") === "applicant"
    );

    return {
      _id: submission._id,
      roleTitle,
      location,
      seniority,
      status: submission.status,
      entryMethod: submission.entryMethod,
      candidateName: submission.candidateName,
      candidateEmail: submission.candidateEmail,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      comments: visibleComments,
    };
  },
});

/**
 * Withdraw an application.
 */
export const withdrawApplication = mutation({
  args: { submissionId: v.id("htSubmissions"), clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Application not found");
    if (submission.candidateUserId !== args.clerkId) throw new Error("Access denied");

    const terminalStatuses = ["joined", "rejected", "withdrawn", "verification_expired"];
    if (terminalStatuses.includes(submission.status)) {
      throw new Error("Cannot withdraw — application is already in a terminal state");
    }

    await ctx.db.patch(args.submissionId, {
      status: "withdrawn",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
