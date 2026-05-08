import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireSelf, requireAdmin } from "./_lib/auth";

// ── Queries ──

export const listByUser = query({
  args: {
    userId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit }) => {
    await requireSelf(ctx, userId);
    return await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 50);
  },
});

export const listByOrg = query({
  args: {
    orgId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, limit }) => {
    const identity = await requireUser(ctx);
    const org = await ctx.db.get(orgId);
    if (!org) throw new Error("Not found");
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && org.createdByClerkId !== identity.subject) {
      throw new Error("Forbidden");
    }
    return await ctx.db
      .query("invoices")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(limit ?? 50);
  },
});

export const getById = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const identity = await requireUser(ctx);
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) throw new Error("Not found");
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role === "admin") return invoice;
    if (invoice.userId === identity.subject) return invoice;
    if (invoice.orgId) {
      const org = await ctx.db.get(invoice.orgId);
      if (org && org.createdByClerkId === identity.subject) return invoice;
    }
    throw new Error("Forbidden");
  },
});

export const getSummaryByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireSelf(ctx, userId);
    const all = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const outstanding = all
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + i.total, 0);
    const paid = all.filter((i) => i.status === "paid");
    const latest = all[0] ?? null;
    return { outstanding, paidCount: paid.length, latestInvoice: latest };
  },
});

export const getSummaryByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const identity = await requireUser(ctx);
    const org = await ctx.db.get(orgId);
    if (!org) throw new Error("Not found");
    const role = (identity.publicMetadata as { role?: string } | undefined)?.role;
    if (role !== "admin" && org.createdByClerkId !== identity.subject) {
      throw new Error("Forbidden");
    }
    const all = await ctx.db
      .query("invoices")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const outstanding = all
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + i.total, 0);
    const paid = all.filter((i) => i.status === "paid");
    const latest = all[0] ?? null;
    const lastPayment = paid.length > 0 ? paid[paid.length - 1] : null;
    return { outstanding, paidCount: paid.length, latestInvoice: latest, lastPayment };
  },
});

// ── Mutations (admin-only — invoices are issued by LLP staff) ──

export const create = mutation({
  args: {
    userId: v.optional(v.string()),
    orgId: v.optional(v.id("organizations")),
    accountType: v.union(v.literal("personal"), v.literal("organization")),
    invoiceNumber: v.string(),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      total: v.number(),
    })),
    subtotal: v.number(),
    tax: v.optional(v.number()),
    total: v.number(),
    currency: v.string(),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    relatedMandateId: v.optional(v.string()),
    relatedServiceRequestId: v.optional(v.string()),
    createdByClerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("invoices", {
      ...args,
      createdByClerkId: identity.subject,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, { invoiceId, status }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(invoiceId, { status, updatedAt: Date.now() });
  },
});

export const markPaid = mutation({
  args: {
    invoiceId: v.id("invoices"),
    paymentMethod: v.string(),
    paymentReference: v.optional(v.string()),
    paidAmount: v.number(),
  },
  handler: async (ctx, { invoiceId, paymentMethod, paymentReference, paidAmount }) => {
    await requireAdmin(ctx);
    const now = Date.now();
    await ctx.db.patch(invoiceId, {
      status: "paid",
      paymentMethod,
      paymentReference,
      paidAmount,
      paidAt: now,
      updatedAt: now,
    });
  },
});
