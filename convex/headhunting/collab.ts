import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireUser, requireSelf } from "../_lib/auth";

// ═══════════════════════════════════════════════════════════════
// Collab Partners
// ═══════════════════════════════════════════════════════════════

export const listPartners = query({
  args: {
    status: v.optional(v.union(
      v.literal("prospect"), v.literal("active"),
      v.literal("paused"), v.literal("terminated")
    )),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db.query("collabPartners")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc").collect();
    }
    return await ctx.db.query("collabPartners").order("desc").collect();
  },
});

export const getPartner = query({
  args: { id: v.id("collabPartners") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const partner = await ctx.db.get(args.id);
    if (!partner) return null;

    const contracts = await ctx.db.query("collabContracts")
      .withIndex("by_partner", (q) => q.eq("partnerId", args.id))
      .collect();

    // Get mandates sourced by this partner
    const mandates = await ctx.db.query("htMandates").collect();
    const partnerMandates = mandates.filter((m) =>
      m.communicationLog?.some((l) =>
        l.note.toLowerCase().includes(partner.companyName.toLowerCase())
      )
    );

    return { ...partner, contracts, mandateCount: partnerMandates.length };
  },
});

export const searchPartners = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.query.trim()) return [];
    return await ctx.db.query("collabPartners")
      .withSearchIndex("search_name", (q) => q.search("companyName", args.query))
      .take(10);
  },
});

export const createPartner = mutation({
  args: {
    companyName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    coverageLanes: v.optional(v.object({
      sectors: v.optional(v.array(v.string())),
      functions: v.optional(v.array(v.string())),
      geographies: v.optional(v.array(v.string())),
    })),
    revenueSharePct: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("collabPartners", {
      ...args,
      status: "prospect",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePartner = mutation({
  args: {
    id: v.id("collabPartners"),
    companyName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    brandColors: v.optional(v.object({
      primary: v.optional(v.string()),
      secondary: v.optional(v.string()),
    })),
    coverageLanes: v.optional(v.object({
      sectors: v.optional(v.array(v.string())),
      functions: v.optional(v.array(v.string())),
      geographies: v.optional(v.array(v.string())),
    })),
    revenueSharePct: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("prospect"), v.literal("active"),
      v.literal("paused"), v.literal("terminated")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

// ═══════════════════════════════════════════════════════════════
// Collab Contracts
// ═══════════════════════════════════════════════════════════════

export const createContract = mutation({
  args: {
    partnerId: v.id("collabPartners"),
    contractType: v.union(
      v.literal("referral"), v.literal("co_delivery"), v.literal("white_label")
    ),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    feeShareLlp: v.number(),
    feeSharePartner: v.number(),
    feeShareScout: v.optional(v.number()),
    terms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Validate shares add up to 100
    const total = args.feeShareLlp + args.feeSharePartner + (args.feeShareScout || 0);
    if (total !== 100) {
      throw new Error(`Fee shares must total 100% (currently ${total}%)`);
    }

    const now = Date.now();
    return await ctx.db.insert("collabContracts", {
      ...args,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateContractStatus = mutation({
  args: {
    id: v.id("collabContracts"),
    status: v.union(
      v.literal("draft"), v.literal("active"),
      v.literal("expired"), v.literal("terminated")
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // If activating contract, also activate partner
    if (args.status === "active") {
      const contract = await ctx.db.get(args.id);
      if (contract) {
        const partner = await ctx.db.get(contract.partnerId);
        if (partner && partner.status === "prospect") {
          await ctx.db.patch(contract.partnerId, {
            status: "active",
            updatedAt: Date.now(),
          });
        }
      }
    }
  },
});

// ═══════════════════════════════════════════════════════════════
// Collaborator Dashboard Queries & Mutations
// ═══════════════════════════════════════════════════════════════

/**
 * Get mandates linked to a collaborator partner.
 */
export const getMandatesByPartner = query({
  args: { partnerId: v.id("collabPartners") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const mandates = await ctx.db
      .query("htMandates")
      .filter((q) => q.eq(q.field("partnerId"), args.partnerId))
      .collect();

    const results = [];
    for (const mandate of mandates) {
      const client = await ctx.db.get(mandate.clientId);
      const blueprint = await ctx.db
        .query("htRoleBlueprints")
        .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
        .order("desc")
        .first();

      // Count submissions by status
      const submissions = await ctx.db
        .query("htSubmissions")
        .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
        .collect();

      const statusCounts: Record<string, number> = {};
      for (const s of submissions) {
        statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
      }

      results.push({
        _id: mandate._id,
        title: blueprint?.title ?? mandate.rawTitle,
        clientName: client?.companyName ?? "Unknown",
        status: mandate.status,
        urgency: mandate.urgency,
        createdAt: mandate.createdAt,
        statusCounts,
        totalCandidates: submissions.length,
      });
    }

    return results;
  },
});

/**
 * Get shortlist packs pending collaborator review.
 */
export const getPendingShortlists = query({
  args: { partnerId: v.id("collabPartners") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    // Get mandates for this partner
    const mandates = await ctx.db
      .query("htMandates")
      .filter((q) => q.eq(q.field("partnerId"), args.partnerId))
      .collect();

    // Get all shortlist packs for these mandates with collaborator status
    const packs = [];
    for (const mandate of mandates) {
      const mandatePacks = await ctx.db
        .query("htShortlistPacks")
        .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
        .collect();

      for (const pack of mandatePacks) {
        if (pack.status === "sent_to_collaborator") {
          const blueprint = await ctx.db
            .query("htRoleBlueprints")
            .withIndex("by_mandate", (q) => q.eq("mandateId", mandate._id))
            .order("desc")
            .first();

          // Get submission details
          const submissions = [];
          for (const subId of pack.submissionIds) {
            const sub = await ctx.db.get(subId);
            if (sub) {
              submissions.push({
                _id: sub._id,
                candidateName: sub.candidateName,
                aiFitScore: sub.aiFitScore,
                status: sub.status,
              });
            }
          }

          packs.push({
            _id: pack._id,
            mandateId: mandate._id,
            mandateTitle: blueprint?.title ?? mandate.rawTitle,
            version: pack.version,
            candidateCount: pack.submissionIds.length,
            submissions,
            createdAt: pack.createdAt,
          });
        }
      }
    }

    return packs;
  },
});

/**
 * Collaborator releases a shortlist to the end client.
 */
export const releaseShortlistToClient = mutation({
  args: {
    packId: v.id("htShortlistPacks"),
    collaboratorNotes: v.optional(v.string()),
    collaboratorClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.collaboratorClerkId);
    const pack = await ctx.db.get(args.packId);
    if (!pack) throw new Error("Shortlist pack not found");
    if (pack.status !== "sent_to_collaborator") {
      throw new Error("Pack is not pending collaborator review");
    }

    const now = Date.now();

    await ctx.db.patch(args.packId, {
      status: "sent",
      sentToClientAt: now,
      collaboratorReviewedAt: now,
      collaboratorReviewedBy: args.collaboratorClerkId,
      collaboratorNotes: args.collaboratorNotes,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Get partner by clerk ID (for collaborator auth).
 */
export const getPartnerByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.clerkId);
    // Check if the user is a contact for any partner
    const contact = await ctx.db
      .query("htClientContacts")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!contact) return null;

    // Find partner linked to this client
    // For now, check collabPartners by matching contact email
    const partners = await ctx.db.query("collabPartners").collect();
    const partner = partners.find((p) => p.contactEmail === contact.email);

    return partner ?? null;
  },
});

// ═══════════════════════════════════════════════════════════════
// Revenue Split Calculator (for partner placements)
// ═══════════════════════════════════════════════════════════════

export const calculateThreeWaySplit = query({
  args: {
    placementId: v.id("htPlacements"),
    contractId: v.id("collabContracts"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const placement = await ctx.db.get(args.placementId);
    const contract = await ctx.db.get(args.contractId);
    if (!placement || !contract) return null;

    const totalFee = placement.feeAmount || 0;
    return {
      totalFee,
      llpShare: Math.round(totalFee * (contract.feeShareLlp / 100)),
      partnerShare: Math.round(totalFee * (contract.feeSharePartner / 100)),
      scoutShare: contract.feeShareScout
        ? Math.round(totalFee * (contract.feeShareScout / 100))
        : 0,
    };
  },
});
