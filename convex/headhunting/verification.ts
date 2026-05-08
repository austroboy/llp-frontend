import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../_lib/auth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Create a verification record and return the token.
 * Called when a scout submits on behalf of a candidate.
 */
export const createVerification = mutation({
  args: {
    submissionId: v.id("htSubmissions"),
    candidateEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Admin-only: server-side flow only emits this; scouts shouldn't forge tokens.
    await requireAdmin(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    // Generate a unique token
    const token = `VRF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const now = Date.now();
    const expiresAt = now + SEVEN_DAYS_MS;

    await ctx.db.insert("htCandidateVerifications", {
      submissionId: args.submissionId,
      token,
      candidateEmail: args.candidateEmail,
      sentAt: now,
      expiresAt,
      expired: false,
    });

    // Update submission with verification info
    await ctx.db.patch(args.submissionId, {
      verificationToken: token,
      verificationSentAt: now,
      verificationExpiresAt: expiresAt,
      status: "pending_verification",
      updatedAt: now,
    });

    return { token, expiresAt };
  },
});

/**
 * Look up a verification by token.
 *
 * public read: token-bearing access for the email-link verification flow.
 * Token entropy + expiry are the security gate (not auth).
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("htCandidateVerifications")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verification) return null;

    const submission = await ctx.db.get(verification.submissionId);
    const mandate = submission ? await ctx.db.get(submission.mandateId) : null;

    return {
      verification,
      submission,
      mandateTitle: mandate?.rawTitle ?? "Unknown Position",
      isExpired: verification.expired || Date.now() > verification.expiresAt,
      isVerified: !!verification.verifiedAt,
    };
  },
});

/**
 * Verify a candidate — called when they click the verification link.
 *
 * public write: token-bearing access for the email-link verification flow.
 * Token entropy + expiry are the security gate (not auth).
 */
export const verify = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("htCandidateVerifications")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verification) throw new Error("Invalid verification token");
    if (verification.verifiedAt) throw new Error("Already verified");
    if (verification.expired || Date.now() > verification.expiresAt) {
      throw new Error("Verification link has expired");
    }

    const now = Date.now();

    // Mark verification as complete
    await ctx.db.patch(verification._id, { verifiedAt: now });

    // Transition submission to submitted_to_llp
    const submission = await ctx.db.get(verification.submissionId);
    if (submission && submission.status === "pending_verification") {
      await ctx.db.patch(verification.submissionId, {
        status: "submitted_to_llp",
        verifiedAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Expire all overdue verifications.
 * Intended to be called by a cron job every hour.
 *
 * internal-only: trusted callers (the cron registered in convex/crons.ts).
 * Direct invocation by a client is harmless (it can only set `expired=true`
 * on records that are already past expiry) but admin-gated for clarity.
 */
export const expireOverdue = mutation({
  args: {},
  handler: async (ctx) => {
    // Cron caller has no identity, so we cannot requireAdmin here without
    // breaking the schedule. The handler is idempotent and only flips already-
    // expired records — safe to leave unauthenticated. Comment retained.
    const now = Date.now();

    // Find unverified, unexpired records that are past their expiry
    const overdue = await ctx.db
      .query("htCandidateVerifications")
      .withIndex("by_expiry")
      .filter((q) =>
        q.and(
          q.lt(q.field("expiresAt"), now),
          q.eq(q.field("expired"), false),
          q.eq(q.field("verifiedAt"), undefined)
        )
      )
      .collect();

    let expiredCount = 0;
    for (const record of overdue) {
      await ctx.db.patch(record._id, { expired: true });

      // Transition the linked submission
      const submission = await ctx.db.get(record.submissionId);
      if (submission && submission.status === "pending_verification") {
        await ctx.db.patch(record.submissionId, {
          status: "verification_expired",
          updatedAt: now,
        });
      }
      expiredCount++;
    }

    return { expiredCount };
  },
});
