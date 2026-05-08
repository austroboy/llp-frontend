import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireAdmin } from "./_lib/auth";

export const listByInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const identity = await requireUser(ctx);
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) throw new Error("Not found");
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && invoice.userId !== identity.subject) {
      throw new Error("Forbidden");
    }
    return await ctx.db
      .query("payments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .order("desc")
      .collect();
  },
});

// Admin-only: payment recording must come from server-side gateway webhooks
// or admin action. Never let an arbitrary client mark themselves as "paid".
export const create = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
    currency: v.string(),
    method: v.string(),
    transactionId: v.optional(v.string()),
    gatewayResponse: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("payments", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    paymentId: v.id("payments"),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    transactionId: v.optional(v.string()),
    gatewayResponse: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, status, transactionId, gatewayResponse }) => {
    await requireAdmin(ctx);
    const updates: Record<string, unknown> = { status };
    if (transactionId) updates.transactionId = transactionId;
    if (gatewayResponse) updates.gatewayResponse = gatewayResponse;
    await ctx.db.patch(paymentId, updates);
  },
});

export const verifyManual = mutation({
  args: {
    paymentId: v.id("payments"),
    verifiedByClerkId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, verifiedByClerkId, notes }) => {
    const identity = await requireAdmin(ctx);
    // Force verifiedByClerkId to authenticated subject — never trust arg.
    await ctx.db.patch(paymentId, {
      status: "completed",
      verifiedByClerkId: identity.subject,
      verifiedAt: Date.now(),
      ...(notes ? { notes } : {}),
    });
  },
});
