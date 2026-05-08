import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_lib/auth";

// --- Queries ---

export const getSubmissionsByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const submissions = await ctx.db
      .query("htSubmissions")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      submissions.map(async (s) => {
        let scoutName: string | undefined;
        if (s.scoutId) {
          const expert = await ctx.db
            .query("experts")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", s.scoutId))
            .first();
          scoutName = expert?.name;
        }
        // Get screening record if exists
        const screeningRecord = await ctx.db
          .query("htScreeningRecords")
          .withIndex("by_submission", (q) => q.eq("submissionId", s._id))
          .first();

        // Get CV URL if file exists
        let cvUrl: string | null = null;
        if (s.cvFileId) {
          cvUrl = await ctx.storage.getUrl(s.cvFileId);
        }

        return {
          ...s,
          scoutName,
          screeningRecord,
          cvUrl,
        };
      })
    );
    return enriched;
  },
});

export const getSubmissionDetail = query({
  args: { id: v.id("htSubmissions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const sub = await ctx.db.get(args.id);
    if (!sub) return null;

    const mandate = await ctx.db.get(sub.mandateId);
    const blueprint = mandate
      ? await ctx.db
          .query("htRoleBlueprints")
          .withIndex("by_mandate", (q) => q.eq("mandateId", sub.mandateId))
          .order("desc")
          .first()
      : null;

    let scoutName: string | undefined;
    if (sub.scoutId) {
      const expert = await ctx.db
        .query("experts")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", sub.scoutId))
        .first();
      scoutName = expert?.name;
    }

    const screeningRecord = await ctx.db
      .query("htScreeningRecords")
      .withIndex("by_submission", (q) => q.eq("submissionId", sub._id))
      .first();

    let cvUrl: string | null = null;
    if (sub.cvFileId) {
      cvUrl = await ctx.storage.getUrl(sub.cvFileId);
    }

    return {
      ...sub,
      scoutName,
      cvUrl,
      screeningRecord,
      mandate: mandate
        ? { rawTitle: mandate.rawTitle, status: mandate.status }
        : null,
      blueprint: blueprint
        ? {
            title: blueprint.title,
            function: blueprint.function,
            seniority: blueprint.seniority,
            location: blueprint.location,
            mustHaves: blueprint.mustHaves,
            dealBreakers: blueprint.dealBreakers,
            criticalMatchPoints: blueprint.criticalMatchPoints,
            generalMatchPoints: blueprint.generalMatchPoints,
            shortlistMin: blueprint.shortlistMin,
            shortlistMax: blueprint.shortlistMax,
          }
        : null,
    };
  },
});

// --- Screening Record Mutations ---

export const upsertScreeningRecord = mutation({
  args: {
    submissionId: v.id("htSubmissions"),
    reviewedBy: v.string(),
    fitScore: v.optional(v.number()),
    ragFlag: v.optional(v.union(v.literal("red"), v.literal("amber"), v.literal("green"))),
    roleMatchNotes: v.optional(v.string()),
    reportingLineNote: v.optional(v.string()),
    careerFlowNote: v.optional(v.string()),
    compensationNote: v.optional(v.string()),
    noticePeriodNote: v.optional(v.string()),
    locationNote: v.optional(v.string()),
    informationGaps: v.optional(v.array(v.string())),
    aiSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("htScreeningRecords")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("htScreeningRecords", {
        ...args,
        updatedAt: now,
      });
    }
  },
});

export const addScreeningComment = mutation({
  args: {
    submissionId: v.id("htSubmissions"),
    author: v.string(),
    text: v.string(),
    visibility: v.optional(v.union(
      v.literal("internal"),
      v.literal("scout"),
      v.literal("collaborator"),
      v.literal("client"),
      v.literal("applicant"),
    )),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db
      .query("htScreeningRecords")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .first();

    const comment = {
      author: args.author,
      text: args.text,
      timestamp: Date.now(),
      visibility: args.visibility ?? ("internal" as const),
    };

    if (record) {
      const comments = record.comments ?? [];
      await ctx.db.patch(record._id, {
        comments: [...comments, comment],
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("htScreeningRecords", {
        submissionId: args.submissionId,
        reviewedBy: args.author,
        comments: [comment],
        updatedAt: Date.now(),
      });
    }
  },
});

// Save AI-parsed CV data + fit scores directly on submission
export const saveAiAnalysis = mutation({
  args: {
    submissionId: v.id("htSubmissions"),
    aiCvSummary: v.optional(v.string()),
    aiParsedData: v.optional(v.object({
      name: v.optional(v.string()),
      currentTitle: v.optional(v.string()),
      currentCompany: v.optional(v.string()),
      yearsExperience: v.optional(v.number()),
      skills: v.optional(v.array(v.string())),
      education: v.optional(v.array(v.object({
        degree: v.optional(v.string()),
        institution: v.optional(v.string()),
        year: v.optional(v.string()),
      }))),
      experience: v.optional(v.array(v.object({
        title: v.optional(v.string()),
        company: v.optional(v.string()),
        duration: v.optional(v.string()),
        description: v.optional(v.string()),
      }))),
      salary: v.optional(v.string()),
      location: v.optional(v.string()),
      noticePeriod: v.optional(v.string()),
    })),
    aiFitScore: v.optional(v.number()),
    aiFitDetails: v.optional(v.object({
      criticalMatches: v.optional(v.array(v.object({
        point: v.string(),
        met: v.boolean(),
        score: v.number(),
        reason: v.string(),
      }))),
      generalMatches: v.optional(v.array(v.object({
        point: v.string(),
        score: v.number(),
        reason: v.string(),
      }))),
      gaps: v.optional(v.array(v.string())),
      strengths: v.optional(v.array(v.string())),
      risks: v.optional(v.array(v.string())),
      complianceFlags: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new Error("Submission not found");

    await ctx.db.patch(args.submissionId, {
      aiCvSummary: args.aiCvSummary,
      aiParsedData: args.aiParsedData,
      aiFitScore: args.aiFitScore,
      aiFitDetails: args.aiFitDetails,
      updatedAt: Date.now(),
    });
  },
});

// --- Shortlist Pack Mutations ---

export const getShortlistByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("htShortlistPacks")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .order("desc")
      .first();
  },
});

export const createShortlistPack = mutation({
  args: {
    mandateId: v.id("htMandates"),
    submissionIds: v.array(v.id("htSubmissions")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Get existing packs to determine version
    const existing = await ctx.db
      .query("htShortlistPacks")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .collect();
    const version = existing.length + 1;
    const now = Date.now();

    return await ctx.db.insert("htShortlistPacks", {
      mandateId: args.mandateId,
      submissionIds: args.submissionIds,
      version,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const sendShortlistToClient = mutation({
  args: { id: v.id("htShortlistPacks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const pack = await ctx.db.get(args.id);
    if (!pack) throw new Error("Shortlist pack not found");

    // Check if mandate has a collaborator partner — two-step release
    const mandate = await ctx.db.get(pack.mandateId);
    const hasCollaborator = mandate?.partnerId != null;

    const now = Date.now();

    if (hasCollaborator) {
      // Collaborator mandate: send to collaborator for review first
      await ctx.db.patch(args.id, {
        status: "sent_to_collaborator",
        updatedAt: now,
      });
    } else {
      // Standard mandate: send directly to client
      await ctx.db.patch(args.id, {
        status: "sent",
        sentToClientAt: now,
        updatedAt: now,
      });
    }
  },
});

export const saveClientFeedback = mutation({
  args: {
    id: v.id("htShortlistPacks"),
    feedback: v.string(),
    status: v.union(v.literal("reviewed"), v.literal("accepted")),
  },
  handler: async (ctx, args) => {
    // Defaulted to admin-only: client feedback in this signature isn't bound to
    // the calling client identity. Tighten until contact-link verification is added.
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      clientFeedback: args.feedback,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// --- Status Mutations ---

export const updateSubmissionStatus = mutation({
  args: {
    id: v.id("htSubmissions"),
    status: v.union(
      // Pre-LLP intake
      v.literal("pending_scout_review"),
      v.literal("pending_verification"),
      v.literal("verification_expired"),
      // LLP intake
      v.literal("submitted_to_llp"),
      v.literal("under_review"),
      v.literal("verified"),
      // Client-facing
      v.literal("shortlist_shared"),
      v.literal("interview"),
      v.literal("offer_stage"),
      v.literal("offer_extended"),
      v.literal("offer_accepted"),
      v.literal("joined"),
      // Terminal
      v.literal("rejected"),
      v.literal("withdrawn"),
      // Legacy (backward compat)
      v.literal("submitted"),
      v.literal("screening"),
      v.literal("shortlisted"),
      v.literal("selected"),
      v.literal("offer"),
    ),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const sub = await ctx.db.get(args.id);
    if (!sub) throw new Error("Submission not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      rejectionReason: args.rejectionReason,
      updatedAt: Date.now(),
    });
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id("htSubmissions")),
    status: v.union(
      // Pre-LLP intake
      v.literal("pending_scout_review"),
      v.literal("pending_verification"),
      v.literal("verification_expired"),
      // LLP intake
      v.literal("submitted_to_llp"),
      v.literal("under_review"),
      v.literal("verified"),
      // Client-facing
      v.literal("shortlist_shared"),
      v.literal("interview"),
      v.literal("offer_stage"),
      v.literal("offer_extended"),
      v.literal("offer_accepted"),
      v.literal("joined"),
      // Terminal
      v.literal("rejected"),
      v.literal("withdrawn"),
      // Legacy (backward compat)
      v.literal("submitted"),
      v.literal("screening"),
      v.literal("shortlisted"),
      v.literal("selected"),
      v.literal("offer"),
    ),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    for (const id of args.ids) {
      await ctx.db.patch(id, {
        status: args.status,
        rejectionReason: args.status === "rejected" ? args.rejectionReason : undefined,
        updatedAt: now,
      });
    }
    return { updated: args.ids.length };
  },
});
