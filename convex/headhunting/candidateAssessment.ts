import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_lib/auth";

const scoreEntryValidator = v.object({
  requirementId: v.string(),
  aiScore: v.optional(v.number()),
  aiReason: v.optional(v.string()),
  scoutScore: v.optional(v.number()),
  scoutNote: v.optional(v.string()),
  finalScore: v.optional(v.number()),
});

const assessmentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("ai_scored"),
  v.literal("scout_reviewed"),
  v.literal("finalized")
);

// --- Queries ---

export const getBySubmission = query({
  args: { submissionId: v.id("htSubmissions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("htCandidateAssessments")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .first();
  },
});

export const getByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("htCandidateAssessments")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("htCandidateAssessments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

export const getByMandateWithStatus = query({
  args: {
    mandateId: v.id("htMandates"),
    status: assessmentStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("htCandidateAssessments")
      .withIndex("by_mandate_status", (q) =>
        q.eq("mandateId", args.mandateId).eq("status", args.status)
      )
      .collect();
  },
});

// --- Helper: compute weighted scores ---

function computeWeightedScores(
  scores: Array<{
    requirementId: string;
    aiScore?: number;
    aiReason?: string;
    scoutScore?: number;
    scoutNote?: string;
    finalScore?: number;
  }>,
  requirements: Array<{
    id: string;
    weight: number;
  }>
) {
  let weightedTotal = 0;
  let maxPossible = 0;

  for (const req of requirements) {
    const score = scores.find((s) => s.requirementId === req.id);
    const effectiveScore = score?.finalScore ?? score?.scoutScore ?? score?.aiScore;
    maxPossible += req.weight * 10; // max score per requirement is 10
    if (effectiveScore !== undefined) {
      weightedTotal += req.weight * effectiveScore;
    }
  }

  const matchPercentage = maxPossible > 0 ? Math.round((weightedTotal / maxPossible) * 100) : 0;
  return { weightedTotal, maxPossible, matchPercentage };
}

// --- Mutations ---

export const create = mutation({
  args: {
    mandateId: v.id("htMandates"),
    submissionId: v.id("htSubmissions"),
    matrixId: v.id("htRequirementMatrix"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const [mandate, submission, matrix] = await Promise.all([
      ctx.db.get(args.mandateId),
      ctx.db.get(args.submissionId),
      ctx.db.get(args.matrixId),
    ]);
    if (!mandate) throw new Error("Mandate not found");
    if (!submission) throw new Error("Submission not found");
    if (!matrix) throw new Error("Requirement matrix not found");
    if (submission.mandateId !== args.mandateId) {
      throw new Error("Submission does not belong to this mandate");
    }
    if (matrix.mandateId !== args.mandateId) {
      throw new Error("Matrix does not belong to this mandate");
    }

    // Check for existing assessment
    const existing = await ctx.db
      .query("htCandidateAssessments")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .first();
    if (existing) throw new Error("Assessment already exists for this submission");

    // Initialize scores array with empty entries for each requirement
    const scores = matrix.requirements.map((req) => ({
      requirementId: req.id,
    }));

    const now = Date.now();
    return await ctx.db.insert("htCandidateAssessments", {
      mandateId: args.mandateId,
      submissionId: args.submissionId,
      matrixId: args.matrixId,
      scores,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveAiAssessment = mutation({
  args: {
    id: v.id("htCandidateAssessments"),
    scores: v.array(v.object({
      requirementId: v.string(),
      aiScore: v.number(),
      aiReason: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const assessment = await ctx.db.get(args.id);
    if (!assessment) throw new Error("Assessment not found");

    const matrix = await ctx.db.get(assessment.matrixId);
    if (!matrix) throw new Error("Matrix not found");

    // Merge AI scores into existing scores
    const updatedScores = assessment.scores.map((existing) => {
      const aiEntry = args.scores.find((s) => s.requirementId === existing.requirementId);
      if (aiEntry) {
        return {
          ...existing,
          aiScore: aiEntry.aiScore,
          aiReason: aiEntry.aiReason,
        };
      }
      return existing;
    });

    const { weightedTotal, maxPossible, matchPercentage } = computeWeightedScores(
      updatedScores,
      matrix.requirements
    );

    await ctx.db.patch(args.id, {
      scores: updatedScores,
      weightedTotal,
      maxPossible,
      matchPercentage,
      status: "ai_scored",
      aiScoredAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("htCandidateAssessments"),
    status: assessmentStatusValidator,
    finalizedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const assessment = await ctx.db.get(args.id);
    if (!assessment) throw new Error("Assessment not found");

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "finalized") {
      updates.finalizedAt = Date.now();
      if (args.finalizedBy) updates.finalizedBy = args.finalizedBy;
    }
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
  },
});

export const setFinalScores = mutation({
  args: {
    id: v.id("htCandidateAssessments"),
    scores: v.array(v.object({
      requirementId: v.string(),
      finalScore: v.number(),
    })),
    finalizedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const assessment = await ctx.db.get(args.id);
    if (!assessment) throw new Error("Assessment not found");

    const matrix = await ctx.db.get(assessment.matrixId);
    if (!matrix) throw new Error("Matrix not found");

    const updatedScores = assessment.scores.map((existing) => {
      const finalEntry = args.scores.find((s) => s.requirementId === existing.requirementId);
      if (finalEntry) {
        return { ...existing, finalScore: finalEntry.finalScore };
      }
      return existing;
    });

    const { weightedTotal, maxPossible, matchPercentage } = computeWeightedScores(
      updatedScores,
      matrix.requirements
    );

    await ctx.db.patch(args.id, {
      scores: updatedScores,
      weightedTotal,
      maxPossible,
      matchPercentage,
      status: "finalized",
      finalizedAt: Date.now(),
      finalizedBy: args.finalizedBy,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("htCandidateAssessments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const assessment = await ctx.db.get(args.id);
    if (!assessment) throw new Error("Assessment not found");
    await ctx.db.delete(args.id);
  },
});

// ─────────────────────────────────────────────────────────────────
// Sprint 1: Save AI per-requirement evaluation results
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Sprint 2: Save scout override review
// ─────────────────────────────────────────────────────────────────

export const saveScoutReview = mutation({
  args: {
    submissionId: v.id("htSubmissions"),
    overrides: v.array(v.object({
      requirementId: v.string(),
      scoutMatchLevel: v.string(),
      scoutJustification: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("htCandidateAssessments")
      .withIndex("by_submission", q => q.eq("submissionId", args.submissionId))
      .first();

    if (!existing) throw new Error("Assessment not found — run AI scoring first");

    const now = Date.now();
    const overrideMap = new Map(args.overrides.map(o => [o.requirementId, o]));

    const updatedScores = existing.scores.map(score => {
      const ov = overrideMap.get(score.requirementId);
      if (!ov) return score;
      return {
        ...score,
        scoutMatchLevel: ov.scoutMatchLevel,
        scoutJustification: ov.scoutJustification,
        scoutReviewedAt: now,
      };
    });

    await ctx.db.patch(existing._id, {
      scores: updatedScores,
      status: "scout_reviewed",
      scoutReviewedAt: now,
      updatedAt: now,
    });

    return existing._id;
  },
});

export const saveAiEvaluation = mutation({
  args: {
    submissionId: v.id("htSubmissions"),
    mandateId: v.id("htMandates"),
    matrixId: v.id("htRequirementMatrix"),
    evaluations: v.array(v.object({
      requirementId: v.string(),
      matchLevel: v.string(),
      confidence: v.string(),
      evidence: v.string(),
      missingEvidence: v.string(),
      concern: v.optional(v.string()),
    })),
    overallMatchPct: v.number(),
    mandatoryMatchPct: v.number(),
    goodToHaveMatchPct: v.number(),
    riskFlagCount: v.number(),
    recommendation: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Map evaluations to rich scores array
    const scores = args.evaluations.map(ev => ({
      requirementId: ev.requirementId,
      aiMatchLevel: ev.matchLevel as
        | "Matched"
        | "Partially Matched"
        | "Not Clearly Evident"
        | "Not Matched"
        | "Potential Red Flag",
      aiConfidence: ev.confidence as "High" | "Medium" | "Low",
      aiEvidence: ev.evidence,
      aiMissingEvidence: ev.missingEvidence,
      aiConcern: ev.concern,
    }));

    const recommendation = args.recommendation as
      | "Strong"
      | "Moderate"
      | "Weak"
      | "Not Recommended";

    const now = Date.now();

    // Upsert — update if exists, create if not
    const existing = await ctx.db
      .query("htCandidateAssessments")
      .withIndex("by_submission", q => q.eq("submissionId", args.submissionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        scores,
        overallMatchPct: args.overallMatchPct,
        mandatoryMatchPct: args.mandatoryMatchPct,
        goodToHaveMatchPct: args.goodToHaveMatchPct,
        riskFlagCount: args.riskFlagCount,
        recommendation,
        status: "ai_scored",
        aiScoredAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("htCandidateAssessments", {
      submissionId: args.submissionId,
      mandateId: args.mandateId,
      matrixId: args.matrixId,
      scores,
      overallMatchPct: args.overallMatchPct,
      mandatoryMatchPct: args.mandatoryMatchPct,
      goodToHaveMatchPct: args.goodToHaveMatchPct,
      riskFlagCount: args.riskFlagCount,
      recommendation,
      status: "ai_scored",
      aiScoredAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});
