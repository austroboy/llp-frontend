import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireSelf } from "../_lib/auth";

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Create origin protection when a scout first submits a candidate.
 */
export const createProtection = mutation({
  args: { submissionId: v.id("htSubmissions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    if (!submission.scoutId) return null; // Only scout submissions get protection

    const email = submission.candidateEmail.toLowerCase().trim();

    // Check if protection already exists for this candidate
    const existing = await ctx.db
      .query("htOriginProtections")
      .withIndex("by_email", (q) => q.eq("candidateEmail", email))
      .first();

    if (existing && !existing.revokedAt && Date.now() < existing.protectedUntil) {
      // Protection already exists and is active — don't create duplicate
      return { protectionId: existing._id, alreadyExisted: true, originScoutId: existing.originScoutId };
    }

    const now = Date.now();
    const protectionId = await ctx.db.insert("htOriginProtections", {
      candidateEmail: email,
      candidatePhone: submission.candidatePhone,
      candidateName: submission.candidateName,
      candidateCurrentOrg: submission.candidateCurrentOrg,
      originScoutId: submission.scoutId,
      originMandateId: submission.mandateId,
      originSubmissionId: submission._id,
      protectedUntil: now + TWELVE_MONTHS_MS,
      createdAt: now,
    });

    // Update submission with origin info
    await ctx.db.patch(args.submissionId, {
      originScoutId: submission.scoutId,
      originProtectionExpiry: now + TWELVE_MONTHS_MS,
    });

    return { protectionId, alreadyExisted: false, originScoutId: submission.scoutId };
  },
});

/**
 * Check if a candidate email has active protection.
 */
export const checkProtection = query({
  args: { email: v.string(), phone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const normalizedEmail = args.email.toLowerCase().trim();
    const now = Date.now();

    const protection = await ctx.db
      .query("htOriginProtections")
      .withIndex("by_email", (q) => q.eq("candidateEmail", normalizedEmail))
      .first();

    if (!protection) return null;
    if (protection.revokedAt) return null;
    if (now > protection.protectedUntil) return null;

    return {
      _id: protection._id,
      originScoutId: protection.originScoutId,
      candidateName: protection.candidateName,
      protectedUntil: protection.protectedUntil,
      originMandateId: protection.originMandateId,
    };
  },
});

/**
 * Get all active protections for a scout.
 */
export const getByScout = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const now = Date.now();
    const protections = await ctx.db
      .query("htOriginProtections")
      .withIndex("by_scout", (q) => q.eq("originScoutId", args.scoutId))
      .collect();

    return protections.filter((p) => !p.revokedAt && now < p.protectedUntil);
  },
});

/**
 * Admin revokes a protection.
 */
export const revokeProtection = mutation({
  args: {
    protectionId: v.id("htOriginProtections"),
    revokedBy: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const protection = await ctx.db.get(args.protectionId);
    if (!protection) throw new Error("Protection not found");

    await ctx.db.patch(args.protectionId, {
      revokedAt: Date.now(),
      revokedBy: args.revokedBy,
      revokedReason: args.reason,
    });

    return { success: true };
  },
});
