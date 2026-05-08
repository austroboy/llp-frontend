import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { blockOrgUser } from "../lib/orgGuard";

/**
 * Submit a candidate application — either direct (no referral) or via scout referral code.
 */
export const submitApplication = mutation({
  args: {
    mandateId: v.id("htMandates"),
    candidateName: v.string(),
    candidateEmail: v.string(),
    candidatePhone: v.optional(v.string()),
    candidateCurrentOrg: v.optional(v.string()),
    candidateLinkedin: v.optional(v.string()),
    cvFileId: v.optional(v.id("_storage")),
    referralCode: v.optional(v.string()),
    consentCapturedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Block authenticated org users. Anonymous applies (no identity) are still allowed
    // because the public apply page accepts walk-in candidates.
    await blockOrgUser(ctx);

    const mandate = await ctx.db.get(args.mandateId);
    if (!mandate) throw new Error("Mandate not found");
    if (mandate.status !== "released") throw new Error("This position is not currently accepting applications");

    let scoutId: string | undefined;
    let entryMethod: "direct_apply" | "scout_code_apply" = "direct_apply";
    let briefReleaseId: string | undefined;

    // If referral code provided, look up the scout
    if (args.referralCode) {
      const release = await ctx.db
        .query("htBriefReleases")
        .withIndex("by_referral_code", (q) => q.eq("referralCode", args.referralCode!))
        .first();

      if (release && release.mandateId === args.mandateId) {
        scoutId = release.scoutId;
        entryMethod = "scout_code_apply";
        briefReleaseId = release._id;

        // Check slot availability
        const maxSlots = release.slotsAllocated ?? 7;
        const used = release.slotsUsed ?? 0;
        if (used >= maxSlots) {
          throw new Error("This scout's submission slots are full for this position");
        }
      }
    }

    const now = Date.now();
    const status = scoutId ? "pending_scout_review" : "submitted_to_llp";

    const submissionId = await ctx.db.insert("htSubmissions", {
      mandateId: args.mandateId,
      candidateName: args.candidateName,
      candidateEmail: args.candidateEmail,
      candidatePhone: args.candidatePhone,
      candidateCurrentOrg: args.candidateCurrentOrg,
      candidateLinkedin: args.candidateLinkedin,
      cvFileId: args.cvFileId,
      sourceChannel: scoutId ? "scout" : "self_application",
      scoutId,
      referralCode: args.referralCode,
      entryMethod,
      status,
      duplicateStatus: "unique",
      ownershipTimestamp: now,
      consentCapturedAt: args.consentCapturedAt,
      consentMethod: "form_checkbox",
      createdAt: now,
      updatedAt: now,
    });

    return { submissionId, status, scoutId };
  },
});

/**
 * Get open mandates for the public apply page (direct apply without referral code).
 *
 * public read: filtered by row visibility — only `status === "released"` mandates
 * are returned and confidentiality-level checks mask sensitive client info. The
 * apply page intentionally allows anonymous browsing.
 */
export const getOpenMandates = query({
  args: {},
  handler: async (ctx) => {
    const mandates = await ctx.db
      .query("htMandates")
      .withIndex("by_status", (q) => q.eq("status", "released"))
      .collect();

    // Return limited info — title, location, seniority from latest blueprint
    const results = [];
    for (const mandate of mandates) {
      const blueprint = await ctx.db
        .query("htRoleBlueprints")
        .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
        .order("desc")
        .first();

      if (!blueprint) continue;

      // Respect confidentiality — mask client info
      const clientInfo = blueprint.confidentialityLevel === "disclosed"
        ? { clientId: mandate.clientId }
        : null;

      results.push({
        mandateId: mandate._id,
        title: blueprint.title,
        function: blueprint.function,
        seniority: blueprint.seniority,
        location: blueprint.location,
        confidentialityLevel: blueprint.confidentialityLevel,
        clientInfo,
      });
    }

    return results;
  },
});

/**
 * Generate upload URL for CV file.
 *
 * Anonymous applies (walk-in candidates) are allowed by design on the public
 * apply page. Org users are blocked, individuals + anonymous are allowed.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await blockOrgUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
