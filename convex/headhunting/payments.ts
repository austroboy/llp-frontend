import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireSelf } from "../_lib/auth";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Create a payment chain when a placement is confirmed.
 */
export const createChain = mutation({
  args: {
    placementId: v.id("htPlacements"),
    clientInvoiceAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const placement = await ctx.db.get(args.placementId);
    if (!placement) throw new Error("Placement not found");

    const mandate = await ctx.db.get(placement.mandateId);
    if (!mandate) throw new Error("Mandate not found");

    const chainType = mandate.partnerId ? "collaborator" : "standard";

    // Find the scout from the submission
    const submission = await ctx.db.get(placement.submissionId);
    const scoutId = submission?.scoutId;

    const now = Date.now();
    const chainId = await ctx.db.insert("htPaymentChain", {
      placementId: args.placementId,
      mandateId: placement.mandateId,
      chainType,
      clientInvoiceAmount: args.clientInvoiceAmount ?? placement.feeAmount,
      clientInvoicedAt: now,
      collaboratorId: mandate.partnerId,
      scoutId,
      status: "invoice_sent",
      createdAt: now,
      updatedAt: now,
    });

    return { chainId, chainType };
  },
});

/**
 * Update payment chain status (admin action).
 */
export const updateChainStatus = mutation({
  args: {
    chainId: v.id("htPaymentChain"),
    status: v.union(
      v.literal("invoice_sent"),
      v.literal("client_paid"),
      v.literal("collab_received"),
      v.literal("collab_paid_llp"),
      v.literal("llp_received"),
      v.literal("scout_payout_pending"),
      v.literal("scout_paid"),
      v.literal("completed"),
      v.literal("disputed"),
    ),
    amount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const chain = await ctx.db.get(args.chainId);
    if (!chain) throw new Error("Payment chain not found");

    const now = Date.now();
    const updates: Record<string, any> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.notes) updates.notes = args.notes;

    // Set timestamps and amounts based on status transition
    switch (args.status) {
      case "client_paid":
        updates.clientPaidAt = now;
        break;
      case "collab_received":
        updates.collaboratorReceivedAt = now;
        break;
      case "collab_paid_llp":
        updates.collaboratorPaidLlpAt = now;
        if (args.amount) updates.collaboratorPaidAmount = args.amount;
        break;
      case "llp_received":
        updates.llpReceivedAt = now;
        if (args.amount) updates.llpReceivedAmount = args.amount;
        updates.scoutPayoutDeadline = now + THIRTY_DAYS_MS;
        updates.status = "scout_payout_pending";
        break;
      case "scout_paid":
        updates.scoutPaidAt = now;
        if (args.amount) updates.scoutPayoutAmount = args.amount;
        break;
      case "completed":
        break;
    }

    await ctx.db.patch(args.chainId, updates);
    return { success: true };
  },
});

/**
 * Get payment chains by mandate.
 */
export const getByMandate = query({
  args: { mandateId: v.id("htMandates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("htPaymentChain")
      .withIndex("by_mandate", (q) => q.eq("mandateId", args.mandateId))
      .collect();
  },
});

/**
 * Get all chains with overdue scout payouts.
 */
export const getOverduePayouts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const chains = await ctx.db
      .query("htPaymentChain")
      .withIndex("by_status", (q) => q.eq("status", "scout_payout_pending"))
      .collect();

    return chains.filter((c) => c.scoutPayoutDeadline && c.scoutPayoutDeadline < now);
  },
});

/**
 * Get scout's payment history.
 */
export const getScoutPayments = query({
  args: { scoutId: v.string() },
  handler: async (ctx, args) => {
    await requireSelf(ctx, args.scoutId);
    const all = await ctx.db.query("htPaymentChain").collect();
    const scoutChains = all.filter((c) => c.scoutId === args.scoutId);

    const results = [];
    for (const chain of scoutChains) {
      const placement = await ctx.db.get(chain.placementId);
      const mandate = await ctx.db.get(chain.mandateId);

      results.push({
        ...chain,
        candidateName: placement?.candidateName ?? "Unknown",
        mandateTitle: mandate?.rawTitle ?? "Unknown",
      });
    }

    return results;
  },
});
