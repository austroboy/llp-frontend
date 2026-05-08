import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireSelf } from "../_lib/auth";

// ═══════════════════════════════════════════════════════════════
// Fee Calculation Engine
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate placement fee based on formula.
 * Supported formulas:
 * - "percentage:20" → 20% of annual salary
 * - "fixed:50000" → fixed amount
 * - "tiered:15:20:25" → 15% below 50k, 20% 50-100k, 25% above 100k
 */
function calculateFee(formula: string, annualSalary: number): number {
  const [type, ...params] = formula.split(":");
  switch (type) {
    case "percentage": {
      const pct = parseFloat(params[0]) || 0;
      return Math.round(annualSalary * (pct / 100));
    }
    case "fixed": {
      return parseFloat(params[0]) || 0;
    }
    case "tiered": {
      const [low, mid, high] = params.map(parseFloat);
      if (annualSalary < 600000) return Math.round(annualSalary * ((low || 15) / 100));
      if (annualSalary < 1200000) return Math.round(annualSalary * ((mid || 20) / 100));
      return Math.round(annualSalary * ((high || 25) / 100));
    }
    default:
      return 0;
  }
}

/**
 * Default protection windows by seniority.
 * Manager and below: 3 months
 * Senior Manager / Director: 6 months
 * VP+: 12 months
 */
function defaultProtectionMonths(seniority?: string): number {
  if (!seniority) return 3;
  const s = seniority.toLowerCase();
  if (s.includes("vp") || s.includes("c-") || s.includes("cxo") || s.includes("chief")) return 12;
  if (s.includes("director") || s.includes("senior manager")) return 6;
  return 3;
}

// ═══════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════

export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("offer_accepted"), v.literal("joined"), v.literal("invoiced"),
      v.literal("paid"), v.literal("protection_active"), v.literal("protection_cleared"),
      v.literal("replacement_triggered")
    )),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let placements;
    if (args.status) {
      placements = await ctx.db.query("htPlacements")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc").collect();
    } else {
      placements = await ctx.db.query("htPlacements").order("desc").collect();
    }

    const enriched = await Promise.all(placements.map(async (p) => {
      const mandate = await ctx.db.get(p.mandateId);
      const client = mandate ? await ctx.db.get(mandate.clientId) : null;
      return {
        ...p,
        mandateTitle: mandate?.rawTitle ?? "—",
        clientName: client?.companyName ?? "—",
      };
    }));
    return enriched;
  },
});

export const getById = query({
  args: { id: v.id("htPlacements") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) return null;
    const mandate = await ctx.db.get(p.mandateId);
    const client = mandate ? await ctx.db.get(mandate.clientId) : null;
    const payouts = await ctx.db.query("htPayoutRecords")
      .withIndex("by_placement", (q) => q.eq("placementId", args.id))
      .collect();
    return { ...p, mandateTitle: mandate?.rawTitle, clientName: client?.companyName, payouts };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("htPlacements").collect();
    const totalFees = all.reduce((s, p) => s + (p.feeAmount || 0), 0);
    const active = all.filter((p) =>
      !["protection_cleared", "replacement_triggered"].includes(p.status)
    );
    const protectionActive = all.filter((p) => p.status === "protection_active");
    const protectionExpiring = protectionActive.filter((p) => {
      if (!p.protectionWindowEnd) return false;
      const daysLeft = (p.protectionWindowEnd - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft < 30;
    });

    return {
      totalPlacements: all.length,
      activePlacements: active.length,
      totalFees,
      protectionActive: protectionActive.length,
      protectionExpiringSoon: protectionExpiring.length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// Placement Mutations
// ═══════════════════════════════════════════════════════════════

export const create = mutation({
  args: {
    mandateId: v.id("htMandates"),
    submissionId: v.id("htSubmissions"),
    salary: v.optional(v.number()),
    feeFormula: v.optional(v.string()),
    feeAmount: v.optional(v.number()),
    protectionMonths: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    const mandate = await ctx.db.get(args.mandateId);
    const blueprint = mandate
      ? await ctx.db.query("htRoleBlueprints")
          .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
          .order("desc").first()
      : null;

    const now = Date.now();

    // Auto-calculate fee if formula provided but no amount
    let feeAmount = args.feeAmount;
    if (!feeAmount && args.feeFormula && args.salary) {
      feeAmount = calculateFee(args.feeFormula, args.salary * 12); // salary → annual
    }

    // Auto-determine protection window if not specified
    const protectionMonths = args.protectionMonths ?? defaultProtectionMonths(blueprint?.seniority);
    const protectionEnd = now + protectionMonths * 30 * 24 * 60 * 60 * 1000;

    // Update submission status
    await ctx.db.patch(args.submissionId, { status: "offer", updatedAt: now });

    return await ctx.db.insert("htPlacements", {
      mandateId: args.mandateId,
      submissionId: args.submissionId,
      candidateName: submission.candidateName,
      offerAcceptedAt: now,
      salary: args.salary,
      feeFormula: args.feeFormula,
      feeAmount: feeAmount,
      protectionWindowEnd: protectionEnd,
      status: "offer_accepted",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("htPlacements"),
    status: v.union(
      v.literal("offer_accepted"), v.literal("joined"), v.literal("invoiced"),
      v.literal("paid"), v.literal("protection_active"), v.literal("protection_cleared"),
      v.literal("replacement_triggered")
    ),
    joinedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) throw new Error("Placement not found");

    const now = Date.now();
    const updates: Record<string, unknown> = { status: args.status, updatedAt: now };

    if (args.status === "joined") {
      updates.joinedAt = args.joinedAt || now;
      // Update submission + mandate
      await ctx.db.patch(p.submissionId, { status: "joined", updatedAt: now });
      await ctx.db.patch(p.mandateId, { status: "filled", updatedAt: now });
      // Auto-transition to protection_active
      updates.status = "protection_active";
    }

    if (args.status === "protection_cleared") {
      // Auto-release held payouts
      const payouts = await ctx.db.query("htPayoutRecords")
        .withIndex("by_placement", (q) => q.eq("placementId", args.id))
        .collect();
      for (const payout of payouts) {
        if (payout.status === "held") {
          await ctx.db.patch(payout._id, { status: "eligible", holdReason: undefined, holdUntil: undefined });
        }
      }
    }

    if (args.status === "replacement_triggered") {
      // Freeze all payouts for this placement
      const payouts = await ctx.db.query("htPayoutRecords")
        .withIndex("by_placement", (q) => q.eq("placementId", args.id))
        .collect();
      for (const payout of payouts) {
        if (payout.status === "eligible" || payout.status === "held") {
          await ctx.db.patch(payout._id, {
            status: "held",
            holdReason: "Replacement triggered — candidate left during protection window",
            holdUntil: now + 90 * 24 * 60 * 60 * 1000, // Hold for 90 days
          });
        }
      }
    }

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Trigger replacement when candidate leaves during protection window.
 * Called by admin when notified of candidate departure.
 */
export const triggerReplacement = mutation({
  args: {
    id: v.id("htPlacements"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) throw new Error("Placement not found");

    // Check if within protection window
    if (p.protectionWindowEnd && Date.now() > p.protectionWindowEnd) {
      throw new Error("Protection window has expired. Cannot trigger replacement.");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "replacement_triggered",
      updatedAt: now,
    });

    // Re-open the mandate for new sourcing
    await ctx.db.patch(p.mandateId, { status: "released", updatedAt: now });

    // Freeze payouts
    const payouts = await ctx.db.query("htPayoutRecords")
      .withIndex("by_placement", (q) => q.eq("placementId", args.id))
      .collect();
    for (const payout of payouts) {
      if (payout.status !== "released") {
        await ctx.db.patch(payout._id, {
          status: "held",
          holdReason: args.reason || "Replacement triggered",
          holdUntil: now + 90 * 24 * 60 * 60 * 1000,
        });
      }
    }

    // Log communication on mandate
    const mandate = await ctx.db.get(p.mandateId);
    if (mandate) {
      const log = mandate.communicationLog ?? [];
      log.push({
        timestamp: now,
        channel: "system",
        note: `Replacement triggered for ${p.candidateName}. ${args.reason || "Candidate left during protection window."}`,
      });
      await ctx.db.patch(p.mandateId, { communicationLog: log });
    }
  },
});

// ═══════════════════════════════════════════════════════════════
// Payout Mutations
// ═══════════════════════════════════════════════════════════════

export const createPayout = mutation({
  args: {
    placementId: v.id("htPlacements"),
    contributorType: v.union(
      v.literal("individual_scout"), v.literal("scout_company"),
      v.literal("self_applicant"), v.literal("llp_internal")
    ),
    contributorId: v.string(),
    rewardFormula: v.optional(v.string()),
    rewardAmount: v.optional(v.number()),
    holdReason: v.optional(v.string()),
    holdUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Auto-calculate reward if formula but no amount
    let rewardAmount = args.rewardAmount;
    if (!rewardAmount && args.rewardFormula) {
      const placement = await ctx.db.get(args.placementId);
      if (placement?.feeAmount) {
        const [type, ...params] = args.rewardFormula.split(":");
        if (type === "percentage") {
          const pct = parseFloat(params[0]) || 0;
          rewardAmount = Math.round(placement.feeAmount * (pct / 100));
        }
      }
    }

    return await ctx.db.insert("htPayoutRecords", {
      placementId: args.placementId,
      contributorType: args.contributorType,
      contributorId: args.contributorId,
      rewardFormula: args.rewardFormula,
      rewardAmount: rewardAmount,
      status: args.holdReason ? "held" : "eligible",
      holdReason: args.holdReason,
      holdUntil: args.holdUntil,
      createdAt: Date.now(),
    });
  },
});

export const releasePayout = mutation({
  args: { id: v.id("htPayoutRecords") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const payout = await ctx.db.get(args.id);
    if (!payout) throw new Error("Payout not found");

    // Check if placement is still valid (not replacement triggered)
    const placement = await ctx.db.get(payout.placementId);
    if (placement?.status === "replacement_triggered") {
      throw new Error("Cannot release payout — replacement has been triggered for this placement.");
    }

    await ctx.db.patch(args.id, { status: "released", releasedAt: Date.now() });

    // Update expert total earnings if scout
    if (payout.contributorType === "individual_scout" && payout.rewardAmount) {
      const expert = await ctx.db.query("experts")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", payout.contributorId))
        .first();
      if (expert) {
        await ctx.db.patch(expert._id, {
          totalEarnings: (expert.totalEarnings || 0) + payout.rewardAmount,
        });
      }
    }
  },
});

export const getPayoutsByContributor = query({
  args: { contributorId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.contributorId);
    const payouts = await ctx.db.query("htPayoutRecords")
      .withIndex("by_contributor", (q) => q.eq("contributorId", args.contributorId))
      .order("desc").collect();

    const enriched = await Promise.all(payouts.map(async (p) => {
      const placement = await ctx.db.get(p.placementId);
      return { ...p, candidateName: placement?.candidateName ?? "—" };
    }));
    return enriched;
  },
});
